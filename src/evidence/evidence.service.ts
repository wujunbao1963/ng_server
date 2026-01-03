import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NgHttpError, NgErrorCodes } from '../common/errors/ng-http-error';
import { NgEdgeDevice } from '../edge-devices/ng-edge-device.entity';
import { NgEventEvidence } from './ng-event-evidence.entity';
import { EvidenceStorageService } from './evidence-storage.service';
import { NgLoggerService } from '../common/infra/logger.service';
import { CLOCK_PORT, ClockPort } from '../common/infra/clock.port';
import {
  CompleteEvidenceUseCase,
  CreateUploadSessionUseCase,
} from '../application';

/**
 * EvidenceService - 证据服务
 *
 * 职责：
 * 1. 编排 UseCase 调用
 * 2. 处理外部服务调用（如预签名 URL）
 * 3. 转换响应格式
 *
 * 设计原则：
 * - 核心业务逻辑在 UseCase 中
 * - Service 负责编排和外部集成
 * - 保持接口向后兼容
 */
@Injectable()
export class EvidenceService {
  private readonly logger: NgLoggerService;

  constructor(
    @InjectRepository(NgEventEvidence)
    private readonly evidenceRepo: Repository<NgEventEvidence>,
    private readonly storage: EvidenceStorageService,
    private readonly createUploadSessionUseCase: CreateUploadSessionUseCase,
    private readonly completeEvidenceUseCase: CompleteEvidenceUseCase,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    logger: NgLoggerService,
  ) {
    this.logger = logger.setContext('EvidenceService');
  }

  /**
   * 创建上传 Session
   */
  async createUploadSession(
    device: NgEdgeDevice,
    circleId: string,
    eventId: string,
    req: any,
  ) {
    const logCtx = { circleId, eventId, deviceId: device.id };

    // 1) 委托给 UseCase 执行核心逻辑
    const { result, presignRequests } = await this.createUploadSessionUseCase.execute(
      circleId,
      eventId,
      device.id,
      { manifest: req?.manifest },
    );

    // 2) 生成预签名 URL（外部服务调用，在 UseCase 事务外执行）
    const uploadUrls: Array<{ sha256: string; url: string }> = [];
    for (const presignReq of presignRequests) {
      const presigned = await this.storage.presignUploadUrl(presignReq);
      uploadUrls.push({ sha256: presignReq.sha256, url: presigned.url });
    }

    this.logger.log('Evidence upload session created with URLs', {
      ...logCtx,
      sessionId: result.sessionId,
      urlCount: uploadUrls.length,
    });

    return {
      sessionId: result.sessionId,
      uploadUrls,
    };
  }

  /**
   * 完成证据上传
   */
  async completeEvidence(
    device: NgEdgeDevice,
    circleId: string,
    eventId: string,
    req: any,
  ) {
    // 委托给 UseCase 执行
    const result = await this.completeEvidenceUseCase.execute(
      circleId,
      eventId,
      device.id,
      {
        sessionId: req.sessionId,
        manifest: req.manifest,
        reportPackage: req.reportPackage,
      },
    );

    // 转换为 API 响应格式
    return this.toCompleteResponse(result);
  }

  /**
   * 获取证据信息
   */
  async getEvidence(circleId: string, eventId: string) {
    const ev = await this.evidenceRepo.findOne({ where: { circleId, eventId } });
    if (!ev) {
      throw new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: NgErrorCodes.NOT_FOUND,
        message: 'Evidence not found',
        timestamp: this.clock.isoNow(),
        retryable: false,
      });
    }

    return {
      eventId: ev.eventId,
      evidenceId: ev.id,
      evidenceStatus: ev.evidenceStatus,
      completedAt: ev.completedAt.toISOString(),
      archivedAt: ev.archivedAt ? ev.archivedAt.toISOString() : null,
      manifest: ev.manifest,
      reportPackage: ev.reportPackage,
      warnings: ev.warnings ?? [],
    };
  }

  /**
   * 获取下载 URL
   */
  async getDownloadUrl(circleId: string, eventId: string, sha256: string) {
    const ev = await this.evidenceRepo.findOne({ where: { circleId, eventId } });
    if (!ev) {
      throw new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: NgErrorCodes.NOT_FOUND,
        message: 'Evidence not found',
        timestamp: this.clock.isoNow(),
        retryable: false,
      });
    }

    const items = (ev.manifest as any)?.items ?? [];
    const found = items.find((x: any) => x.sha256 === sha256);
    if (!found) {
      throw new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: NgErrorCodes.NOT_FOUND,
        message: 'Evidence item not found',
        timestamp: this.clock.isoNow(),
        retryable: false,
      });
    }

    const { url, expiresAt } = await this.storage.presignDownloadUrl({
      circleId,
      eventId,
      sha256,
    });
    return { sha256, url, expiresAt };
  }

  /**
   * 转换 UseCase 结果为 API 响应格式
   */
  private toCompleteResponse(result: {
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
  }) {
    // Contract for POST /evidence/complete expects warnings as an array of objects
    const warnings = result.warnings.map((code) => ({
      code,
      message:
        code === 'REPORT_PACKAGE_NOT_SUPPORTED'
          ? 'Report package upload is not supported in v1 mock storage.'
          : 'See code for details.',
    }));

    const resp: any = {
      accepted: true,
      eventId: result.eventId,
      sessionId: result.sessionId,
      evidenceId: result.evidenceId,
      evidenceStatus: result.evidenceStatus,
      completedAt: result.completedAt.toISOString(),
      archivedAt: result.archivedAt ? result.archivedAt.toISOString() : null,
      manifest: result.manifest,
      reportPackage: result.reportPackage,
      deduped: result.deduped ? true : undefined,
      warnings: warnings.length ? warnings : undefined,
    };

    return resp;
  }
}
