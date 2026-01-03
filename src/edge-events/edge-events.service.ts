import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NgEdgeEvent } from './ng-edge-event.entity';
import { NgLoggerService } from '../common/infra/logger.service';
import { CLOCK_PORT, ClockPort } from '../common/infra/clock.port';
import { IngestEdgeEventUseCase, EdgeEventSummaryUpsertV77, EdgeSummaryUpsertResult } from '../application/usecases/ingest-edge-event.usecase';
import { NotificationsService } from '../notifications/notifications.service';
import { CirclesService } from '../circles/circles.service';

// Re-export types for backward compatibility
export { EdgeEventSummaryUpsertV77, EdgeSummaryUpsertResult };

@Injectable()
export class EdgeEventsService {
  private readonly logger: NgLoggerService;

  constructor(
    @InjectRepository(NgEdgeEvent)
    private readonly edgeRepo: Repository<NgEdgeEvent>,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    private readonly ingestUseCase: IngestEdgeEventUseCase,
    private readonly notificationsService: NotificationsService,
    private readonly circlesService: CirclesService,
    logger: NgLoggerService,
  ) {
    this.logger = logger.setContext('EdgeEventsService');
  }

  /**
   * List edge events for a circle (App read API)
   */
  async listEvents(circleId: string, limit: number = 50): Promise<{ items: any[]; nextCursor: string | null }> {
    const events = await this.edgeRepo.find({
      where: { circleId },
      order: { edgeUpdatedAt: 'DESC' },
      take: limit,
    });

    const items = events.map((ev) => ({
      eventId: ev.eventId,
      edgeInstanceId: ev.edgeInstanceId,
      threatState: ev.threatState,
      triggerReason: ev.triggerReason,
      occurredAt: ev.edgeUpdatedAt.toISOString(),
      updatedAt: ev.edgeUpdatedAt.toISOString(),
      status: this.mapThreatStateToStatus(ev.threatState),
      title: this.generateTitle(ev),
      // Include summary fields if available
      ...(ev.summaryJson && typeof ev.summaryJson === 'object' ? this.extractSummaryFields(ev.summaryJson as Record<string, unknown>) : {}),
    }));

    return { items, nextCursor: null };
  }

  /**
   * Get single edge event
   */
  async getEvent(circleId: string, eventId: string): Promise<any> {
    const ev = await this.edgeRepo.findOne({ where: { circleId, eventId } });
    if (!ev) {
      return null;
    }

    return {
      eventId: ev.eventId,
      edgeInstanceId: ev.edgeInstanceId,
      threatState: ev.threatState,
      triggerReason: ev.triggerReason,
      occurredAt: ev.edgeUpdatedAt.toISOString(),
      updatedAt: ev.edgeUpdatedAt.toISOString(),
      status: this.mapThreatStateToStatus(ev.threatState),
      title: this.generateTitle(ev),
      summaryJson: ev.summaryJson,
    };
  }

  /**
   * Update edge event status (App collaboration)
   */
  async updateEventStatus(
    circleId: string,
    eventId: string,
    status: 'OPEN' | 'ACKED' | 'RESOLVED',
    note?: string,
  ): Promise<{ updated: boolean; eventId: string; status: string; updatedAt: string }> {
    const ev = await this.edgeRepo.findOne({ where: { circleId, eventId } });
    if (!ev) {
      return null as any; // Will be handled by controller
    }

    // Map app status to threatState
    const newThreatState = status === 'RESOLVED' ? 'RESOLVED' : 
                          status === 'ACKED' ? 'PENDING' : ev.threatState;
    
    const now = new Date();
    const updated = ev.threatState !== newThreatState;
    
    if (updated) {
      await this.edgeRepo.update(
        { circleId, eventId },
        { 
          threatState: newThreatState,
          edgeUpdatedAt: now,
        }
      );
    }

    return {
      updated,
      eventId,
      status,
      updatedAt: now.toISOString(),
    };
  }

  private mapThreatStateToStatus(threatState: string): string {
    // Map threatState to app-friendly status
    if (threatState === 'RESOLVED' || threatState === 'CANCELED') return 'RESOLVED';
    if (threatState === 'TRIGGERED') return 'OPEN';
    return 'OPEN';
  }

  private generateTitle(ev: NgEdgeEvent): string {
    const reasonMap: Record<string, string> = {
      'entry_delay_expired': '入侵警报',
      'motion': '移动检测',
      'door_open': '门窗打开',
      'glass_break': '玻璃破碎',
      'delivery_detected': '📦 快递到达',
    };
    return reasonMap[ev.triggerReason || ''] || '安全事件';
  }

  private extractSummaryFields(summary: Record<string, unknown>): Record<string, unknown> {
    const fields: Record<string, unknown> = {};
    if (summary.entryPointId) fields.entryPointId = summary.entryPointId;
    if (summary.mode) fields.mode = summary.mode;
    if (summary.workflowClass) fields.workflowClass = summary.workflowClass;
    if (summary.zoneId) fields.zoneId = summary.zoneId;
    return fields;
  }

  /**
   * 事件摘要入库 - 委托给 UseCase
   *
   * UseCase 返回需要调度的通知，这里负责执行通知调度
   */
  async storeSummaryUpsert(payload: EdgeEventSummaryUpsertV77): Promise<EdgeSummaryUpsertResult> {
    // 1) 委托给 UseCase 执行核心业务逻辑
    const { result, notifications } = await this.ingestUseCase.execute(payload);

    // 2) 处理副作用：调度通知
    for (const notif of notifications) {
      await this.dispatchNotification(notif);
    }

    return result;
  }

  /**
   * 调度通知 - 处理 UseCase 返回的通知请求
   *
   * 将通知调度逻辑从主业务流程中分离，便于：
   * 1. 未来替换为异步队列
   * 2. 添加重试机制
   * 3. 测试时 mock
   */
  private async dispatchNotification(notif: {
    type: string;
    circleId: string;
    eventId: string;
    edgeInstanceId: string;
    entryPointId?: string;
  }): Promise<void> {
    const logCtx = {
      circleId: notif.circleId,
      eventId: notif.eventId,
      deviceId: notif.edgeInstanceId,
    };

    if (notif.type !== 'PARCEL_DETECTED') {
      this.logger.warn('Unknown notification type, skipping', { ...logCtx, type: notif.type });
      return;
    }

    try {
      // 获取 Circle owner
      const ownerUserId = await this.circlesService.getCircleOwner(notif.circleId);
      if (!ownerUserId) {
        this.logger.log('No owner found for circle, skipping notification', logCtx);
        return;
      }

      // 创建快递到达通知
      await this.notificationsService.createParcelNotification({
        userId: ownerUserId,
        circleId: notif.circleId,
        eventId: notif.eventId,
        edgeInstanceId: notif.edgeInstanceId,
        entryPointId: notif.entryPointId,
      });

      this.logger.log('Parcel notification created', logCtx);
    } catch (error) {
      // 通知创建失败不应影响事件处理
      // 未来可改为写入 outbox 重试
      this.logger.error('Failed to create notification', String(error), logCtx);
    }
  }
}
