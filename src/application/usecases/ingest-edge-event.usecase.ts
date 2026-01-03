import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { NgLoggerService } from '../../common/infra/logger.service';
import { CLOCK_PORT, ClockPort } from '../../common/infra/clock.port';
import { stableStringify } from '../../common/utils/stable-json';
import { NgEdgeEvent } from '../../edge-events/ng-edge-event.entity';
import { NgEdgeEventSummaryRaw } from '../../edge-events/ng-edge-event-summary-raw.entity';
import { NgEdgeIngestAudit } from '../../edge-events/ng-edge-ingest-audit.entity';

/**
 * Edge 事件摘要更新请求 (v7.7 Contract)
 */
export type EdgeEventSummaryUpsertV77 = {
  schemaVersion: 'v7.7';
  circleId: string;
  eventId: string;
  edgeInstanceId: string;
  threatState: string;
  updatedAt: string;
  sequence?: number;
  triggerReason?: string;
  workflowClass?: string;
  entryPointId?: string;
  [k: string]: unknown;
};

/**
 * Upsert 结果
 */
export type EdgeSummaryUpsertResult = {
  applied: boolean;
  reason: 'applied' | 'stale_sequence' | 'stale_timestamp' | 'duplicate_payload';
  eventId: string;
  isNew: boolean;
};

/**
 * 通知调度请求 - 用于 UseCase 通知下游
 */
export type NotificationDispatchRequest = {
  type: 'PARCEL_DETECTED';
  circleId: string;
  eventId: string;
  edgeInstanceId: string;
  entryPointId?: string;
};

/**
 * IngestEdgeEventUseCase - Edge 事件入库用例
 *
 * 职责：
 * 1. 验证并存储 Edge 发送的事件摘要
 * 2. 处理幂等性（sequence + timestamp 规则）
 * 3. 返回需要调度的通知请求（不直接调用 NotificationsService）
 *
 * 设计原则：
 * - UseCase 只编排业务逻辑，不直接依赖其他模块的 Service
 * - 副作用（如通知）通过返回值让调用方决定如何处理
 * - 所有数据库操作在单一事务中完成
 */
@Injectable()
export class IngestEdgeEventUseCase {
  private readonly logger: NgLoggerService;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(NgEdgeEventSummaryRaw)
    private readonly rawRepo: Repository<NgEdgeEventSummaryRaw>,
    @InjectRepository(NgEdgeEvent)
    private readonly edgeRepo: Repository<NgEdgeEvent>,
    @InjectRepository(NgEdgeIngestAudit)
    private readonly auditRepo: Repository<NgEdgeIngestAudit>,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    logger: NgLoggerService,
  ) {
    this.logger = logger.setContext('IngestEdgeEventUseCase');
  }

  /**
   * 执行事件入库
   *
   * @returns result - 入库结果
   * @returns notifications - 需要调度的通知列表（由调用方处理）
   */
  async execute(payload: EdgeEventSummaryUpsertV77): Promise<{
    result: EdgeSummaryUpsertResult;
    notifications: NotificationDispatchRequest[];
  }> {
    const incomingSeq = typeof payload.sequence === 'number' ? payload.sequence : 0;
    const incomingUpdatedAt = new Date(payload.updatedAt);
    const payloadHash = sha256Hex(stableStringify(payload));

    const logCtx = {
      circleId: payload.circleId,
      eventId: payload.eventId,
      deviceId: payload.edgeInstanceId,
    };

    this.logger.log('Processing edge event summary upsert', {
      ...logCtx,
      sequence: incomingSeq,
      threatState: payload.threatState,
    });

    const result = await this.dataSource.transaction(async (manager) => {
      // 1) Raw landing write (always) - 用于审计和调试
      const rawRow = this.rawRepo.create({
        circleId: payload.circleId,
        eventId: payload.eventId,
        edgeInstanceId: payload.edgeInstanceId,
        threatState: payload.threatState,
        edgeUpdatedAt: incomingUpdatedAt,
        payload,
      });
      await manager.getRepository(NgEdgeEventSummaryRaw).save(rawRow);

      // 2) Authoritative snapshot upsert
      const repo = manager.getRepository(NgEdgeEvent);
      const audit = manager.getRepository(NgEdgeIngestAudit);

      const existing = await repo.findOne({
        where: { circleId: payload.circleId, eventId: payload.eventId },
        lock: { mode: 'pessimistic_write' },
      });

      // 2a) 新事件 - 直接插入
      if (!existing) {
        const created = repo.create({
          circleId: payload.circleId,
          eventId: payload.eventId,
          edgeInstanceId: payload.edgeInstanceId,
          threatState: payload.threatState,
          triggerReason: payload.triggerReason ?? null,
          edgeUpdatedAt: incomingUpdatedAt,
          lastSequence: String(incomingSeq),
          summaryJson: payload,
          lastPayloadHash: payloadHash,
        });
        await repo.save(created);

        await audit.insert({
          circleId: payload.circleId,
          eventId: payload.eventId,
          edgeInstanceId: payload.edgeInstanceId,
          sequence: String(incomingSeq),
          payloadHash,
          applied: true,
          reason: 'applied',
          schemaVersion: payload.schemaVersion,
          messageType: 'event_summary_upsert',
        });

        this.logger.log('Created new edge event', logCtx);
        return { applied: true, reason: 'applied' as const, isNew: true };
      }

      const storedSeq = Number(existing.lastSequence ?? '0');

      // 2b) 重复 payload 检测（同序列号 + 相同 hash）
      if (
        incomingSeq === storedSeq &&
        existing.lastPayloadHash &&
        existing.lastPayloadHash === payloadHash
      ) {
        await audit.insert({
          circleId: payload.circleId,
          eventId: payload.eventId,
          edgeInstanceId: payload.edgeInstanceId,
          sequence: String(incomingSeq),
          payloadHash,
          applied: false,
          reason: 'duplicate_payload',
          schemaVersion: payload.schemaVersion,
          messageType: 'event_summary_upsert',
        });

        this.logger.log('Duplicate payload detected, skipping', logCtx);
        return { applied: false, reason: 'duplicate_payload' as const, isNew: false };
      }

      // 2c) 过期序列号检测
      if (incomingSeq < storedSeq) {
        await audit.insert({
          circleId: payload.circleId,
          eventId: payload.eventId,
          edgeInstanceId: payload.edgeInstanceId,
          sequence: String(incomingSeq),
          payloadHash,
          applied: false,
          reason: 'stale_sequence',
          schemaVersion: payload.schemaVersion,
          messageType: 'event_summary_upsert',
        });

        this.logger.log('Stale sequence detected, skipping', {
          ...logCtx,
          incomingSeq,
          storedSeq,
        });
        return { applied: false, reason: 'stale_sequence' as const, isNew: false };
      }

      // 2d) 同序列号但时间戳较旧
      if (incomingSeq === storedSeq) {
        if (incomingUpdatedAt.getTime() <= existing.edgeUpdatedAt.getTime()) {
          await audit.insert({
            circleId: payload.circleId,
            eventId: payload.eventId,
            edgeInstanceId: payload.edgeInstanceId,
            sequence: String(incomingSeq),
            payloadHash,
            applied: false,
            reason: 'stale_timestamp',
            schemaVersion: payload.schemaVersion,
            messageType: 'event_summary_upsert',
          });

          this.logger.log('Stale timestamp detected, skipping', logCtx);
          return { applied: false, reason: 'stale_timestamp' as const, isNew: false };
        }
      }

      // 2e) 应用更新
      existing.edgeInstanceId = payload.edgeInstanceId;
      existing.threatState = payload.threatState;
      existing.triggerReason = payload.triggerReason ?? null;
      existing.edgeUpdatedAt = incomingUpdatedAt;
      existing.lastSequence = String(incomingSeq);
      existing.summaryJson = payload;
      existing.lastPayloadHash = payloadHash;
      await repo.save(existing);

      await audit.insert({
        circleId: payload.circleId,
        eventId: payload.eventId,
        edgeInstanceId: payload.edgeInstanceId,
        sequence: String(incomingSeq),
        payloadHash,
        applied: true,
        reason: 'applied',
        schemaVersion: payload.schemaVersion,
        messageType: 'event_summary_upsert',
      });

      this.logger.log('Updated edge event', logCtx);
      return { applied: true, reason: 'applied' as const, isNew: false };
    });

    // 3) 确定需要调度的通知
    const notifications: NotificationDispatchRequest[] = [];

    if (result.applied) {
      // 只有 LOGISTICS + delivery_detected 才触发快递通知
      if (payload.workflowClass === 'LOGISTICS' && payload.triggerReason === 'delivery_detected') {
        notifications.push({
          type: 'PARCEL_DETECTED',
          circleId: payload.circleId,
          eventId: payload.eventId,
          edgeInstanceId: payload.edgeInstanceId,
          entryPointId: payload.entryPointId,
        });
        this.logger.log('Notification dispatch requested: PARCEL_DETECTED', logCtx);
      }
    }

    return {
      result: {
        ...result,
        eventId: payload.eventId,
      },
      notifications,
    };
  }
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}
