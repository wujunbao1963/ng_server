import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { NgLoggerService } from '../../common/infra/logger.service';
import { CLOCK_PORT, ClockPort } from '../../common/infra/clock.port';
import { NgHttpError, NgErrorCodes } from '../../common/errors/ng-http-error';
import { NgEvent } from '../../events-ingest/ng-event.entity';
import { NgEvidenceSession } from '../../evidence/ng-evidence-session.entity';
import { NgEventEvidence } from '../../evidence/ng-event-evidence.entity';

/**
 * Evidence 完成请求
 */
export interface CompleteEvidenceRequest {
  sessionId: string;
  manifest?: any;
  reportPackage?: {
    included: boolean;
    type?: string;
    sha256?: string;
  };
}

/**
 * Evidence 完成结果
 */
export interface CompleteEvidenceResult {
  evidenceId: string;
  eventId: string;
  sessionId: string;
  evidenceStatus: string;
  completedAt: Date;
  archivedAt: Date | null;
  manifest: any;
  reportPackage: any;
  warnings: string[];
  deduped: boolean;
}

/**
 * CompleteEvidenceUseCase - 证据完成用例
 *
 * 职责：
 * 1. 验证 session 存在且匹配
 * 2. 在事务中原子更新 evidence + session
 * 3. 处理幂等性（重复请求返回相同结果）
 * 4. 处理并发（悲观锁防止竞态）
 *
 * 设计原则：
 * - 所有数据库操作在单一事务中完成
 * - 使用悲观锁防止并发问题
 * - 幂等设计：相同请求返回相同结果
 */
@Injectable()
export class CompleteEvidenceUseCase {
  private readonly logger: NgLoggerService;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(NgEvent)
    private readonly eventsRepo: Repository<NgEvent>,
    @InjectRepository(NgEvidenceSession)
    private readonly sessionsRepo: Repository<NgEvidenceSession>,
    @InjectRepository(NgEventEvidence)
    private readonly evidenceRepo: Repository<NgEventEvidence>,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    logger: NgLoggerService,
  ) {
    this.logger = logger.setContext('CompleteEvidenceUseCase');
  }

  /**
   * 执行证据完成
   */
  async execute(
    circleId: string,
    eventId: string,
    deviceId: string,
    request: CompleteEvidenceRequest,
  ): Promise<CompleteEvidenceResult> {
    const { sessionId } = request;
    const logCtx = { circleId, eventId, deviceId, sessionId };

    // 1) 验证事件存在
    await this.mustEventExist(circleId, eventId);

    // 2) 快速失败检查（事务外）
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: NgErrorCodes.NOT_FOUND,
        message: 'Evidence session not found',
        timestamp: this.clock.isoNow(),
        retryable: false,
      });
    }

    if (session.circleId !== circleId || session.eventId !== eventId) {
      throw new NgHttpError({
        statusCode: 409,
        error: 'Conflict',
        code: NgErrorCodes.EVENT_CONFLICT,
        message: 'Evidence session does not match target event',
        timestamp: this.clock.isoNow(),
        retryable: false,
        details: {
          sessionCircleId: session.circleId,
          sessionEventId: session.eventId,
        },
      });
    }

    // 3) 幂等检查：如果已完成，直接返回
    if (session.status === 'COMPLETED' && session.evidenceId) {
      const existing = await this.evidenceRepo.findOne({
        where: { id: session.evidenceId },
      });
      if (existing) {
        this.logger.log('Evidence already completed, returning cached response', logCtx);
        return this.toResult(existing, true);
      }
    }

    this.logger.log('Completing evidence session', logCtx);

    // 4) 在事务中完成 evidence + session 更新
    const evidence = await this.dataSource.transaction(async (manager) => {
      const evidenceRepo = manager.getRepository(NgEventEvidence);
      const sessionRepo = manager.getRepository(NgEvidenceSession);

      // 使用悲观锁重新获取 session，防止并发
      const lockedSession = await sessionRepo.findOne({
        where: { id: sessionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedSession) {
        throw new NgHttpError({
          statusCode: 404,
          error: 'Not Found',
          code: NgErrorCodes.NOT_FOUND,
          message: 'Evidence session not found',
          timestamp: this.clock.isoNow(),
          retryable: false,
        });
      }

      // 双重检查：事务内再次检查是否已完成
      if (lockedSession.status === 'COMPLETED' && lockedSession.evidenceId) {
        const existing = await evidenceRepo.findOne({
          where: { id: lockedSession.evidenceId },
        });
        if (existing) {
          return { evidence: existing, deduped: true };
        }
      }

      // 检查是否已有其他 session 完成了此事件的 evidence
      const existingForEvent = await evidenceRepo.findOne({ where: { eventId } });
      if (existingForEvent) {
        if (existingForEvent.sessionId === sessionId) {
          return { evidence: existingForEvent, deduped: true };
        }
        throw new NgHttpError({
          statusCode: 409,
          error: 'Conflict',
          code: NgErrorCodes.EVENT_CONFLICT,
          message: 'Evidence already completed for this event',
          timestamp: this.clock.isoNow(),
          retryable: false,
        });
      }

      // 构建 evidence 数据
      const now = this.clock.now();
      const { warnings, reportPackage } = this.processReportPackage(request.reportPackage);

      const evidenceId = crypto.randomUUID();
      const newEvidence = evidenceRepo.create({
        id: evidenceId,
        circleId,
        eventId,
        sessionId,
        evidenceStatus: 'ARCHIVED',
        completedAt: now,
        archivedAt: now,
        manifest: request.manifest,
        reportPackage,
        warnings: warnings.length ? warnings : null,
        createdAt: now,
      });

      // 保存 evidence
      await evidenceRepo.save(newEvidence);

      // 更新 session 状态（同一事务）
      lockedSession.status = 'COMPLETED';
      lockedSession.completedAt = now;
      lockedSession.evidenceId = evidenceId;
      await sessionRepo.save(lockedSession);

      this.logger.log('Evidence completed successfully', { ...logCtx, evidenceId });
      return { evidence: newEvidence, deduped: false };
    });

    return this.toResult(evidence.evidence, evidence.deduped);
  }

  /**
   * 处理 reportPackage 并生成警告
   */
  private processReportPackage(reportReq?: {
    included: boolean;
    type?: string;
    sha256?: string;
  }): {
    warnings: string[];
    reportPackage: any;
  } {
    const warnings: string[] = [];
    let reportPackage: any = { included: false, status: 'NONE' };

    if (reportReq && reportReq.included === true) {
      // v1 contract 允许 reportPackage metadata 但不支持上传
      warnings.push('REPORT_PACKAGE_NOT_SUPPORTED');
      reportPackage = {
        included: true,
        type: reportReq.type,
        sha256: reportReq.sha256,
        status: 'FAILED',
      };
    }

    return { warnings, reportPackage };
  }

  /**
   * 验证事件存在
   */
  private async mustEventExist(circleId: string, eventId: string): Promise<void> {
    const ev = await this.eventsRepo.findOne({ where: { circleId, eventId } });
    if (!ev) {
      throw new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: NgErrorCodes.NOT_FOUND,
        message: 'Event not found',
        timestamp: this.clock.isoNow(),
        retryable: false,
      });
    }
  }

  /**
   * 转换为结果对象
   */
  private toResult(ev: NgEventEvidence, deduped: boolean): CompleteEvidenceResult {
    return {
      evidenceId: ev.id,
      eventId: ev.eventId,
      sessionId: ev.sessionId,
      evidenceStatus: ev.evidenceStatus,
      completedAt: ev.completedAt,
      archivedAt: ev.archivedAt,
      manifest: ev.manifest,
      reportPackage: ev.reportPackage,
      warnings: ev.warnings ?? [],
      deduped,
    };
  }
}
