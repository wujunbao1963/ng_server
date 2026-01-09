import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { NgEdgeEvent } from './ng-edge-event.entity';
import { NgEdgeEventSummaryRaw } from './ng-edge-event-summary-raw.entity';
import { NgEdgeIngestAudit } from './ng-edge-ingest-audit.entity';
import { stableStringify } from '../common/utils/stable-json';
import { NotificationsService } from '../notifications/notifications.service';
import { CirclesService } from '../circles/circles.service';
import { EdgeCommandsService } from './edge-commands.service';

export type EdgeEventSummaryUpsertV77 = {
  schemaVersion: 'v7.7';
  circleId: string;
  eventId: string;
  edgeInstanceId: string;
  threatState: string;
  updatedAt: string;
  sequence?: number;
  triggerReason?: string;
  [k: string]: unknown;
};

export type EdgeSummaryUpsertResult = {
  applied: boolean;
  reason: 'applied' | 'stale_sequence' | 'stale_timestamp' | 'duplicate_payload';
};

@Injectable()
export class EdgeEventsService {
  private readonly logger = new Logger(EdgeEventsService.name);

  constructor(
    @InjectRepository(NgEdgeEventSummaryRaw)
    private readonly rawRepo: Repository<NgEdgeEventSummaryRaw>,
    @InjectRepository(NgEdgeEvent)
    private readonly edgeRepo: Repository<NgEdgeEvent>,
    @InjectRepository(NgEdgeIngestAudit)
    private readonly auditRepo: Repository<NgEdgeIngestAudit>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
    private readonly circlesService: CirclesService,
    private readonly commandsService: EdgeCommandsService,
  ) {}

  /**
   * List edge events for a circle (App read API)
   * 
   * v7.7.1 Home Mode 静默规则：
   * - Home 模式下的非强安全事件不在列表中显示
   * - 强安全事件 = TRIGGERED 状态或 glass_break 触发
   * - 这些事件仍然记录在数据库中，可通过管理接口查询
   */
  async listEvents(circleId: string, limit: number = 50): Promise<{ items: any[]; nextCursor: string | null }> {
    // 获取更多事件以补偿过滤后的数量
    const events = await this.edgeRepo.find({
      where: { circleId },
      order: { edgeUpdatedAt: 'DESC' },
      take: limit * 2,  // 获取更多以补偿过滤
    });

    // ========================================================================
    // v7.7.1 Home Mode 静默规则：过滤 Home 模式下的非强安全事件
    // 但保留 LOGISTICS 快递事件（用户在家时也想看到快递通知）
    // ========================================================================
    const filteredEvents = events.filter((ev) => {
      const summary = ev.summaryJson as Record<string, unknown> | null;
      const mode = (summary?.mode as string)?.toLowerCase();
      const workflowClass = summary?.workflowClass as string | undefined;
      
      // 非 Home 模式的事件全部显示
      if (mode !== 'home') {
        return true;
      }
      
      // Home 模式下，显示以下事件：
      // 1. 强安全事件（TRIGGERED, glass_break）
      // 2. LOGISTICS 快递事件
      const isStrongSecurityEvent = 
        ev.threatState === 'TRIGGERED' || 
        ev.triggerReason === 'glass_break';
      
      const isLogisticsEvent = 
        workflowClass === 'LOGISTICS' && 
        ev.triggerReason === 'delivery_detected';
      
      if (!isStrongSecurityEvent && !isLogisticsEvent) {
        this.logger.debug(
          `listEvents: filtering out Home mode event ${ev.eventId} (threatState=${ev.threatState})`
        );
      }
      
      return isStrongSecurityEvent || isLogisticsEvent;
    });
    // ========================================================================

    const items = filteredEvents.slice(0, limit).map((ev) => ({
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
   * 
   * 当 App 用户将事件标记为 RESOLVED 时：
   * 1. [临时补丁] 更新数据库状态（立即生效，保证 App 显示正确）
   * 2. [正确流程] 创建 Edge 命令，让 Edge 执行 resolve，Edge 完成后上报 RESOLVED
   * 
   * 架构说明：
   * - 根据 PRD Contract v7.7，threatState 应由 Edge 决定，Server 不应直接修改
   * - 当前保留补丁是因为命令通道刚实现，需要稳定运行后再移除
   * - 正确的最终流程：Server 只创建命令 → Edge 执行 → Edge 上报状态
   * 
   * TODO [Phase 5d]: 移除 threatState 直接修改补丁
   * - 前提条件：
   *   1. Edge 命令通道稳定运行 2+ 周
   *   2. Edge 已部署 v7.7+ 代码（支持 RESOLVED 上报）
   *   3. 添加命令超时降级机制（如30秒无响应则降级）
   * - 移除后 Server 只更新 appStatus，threatState 完全由 Edge 上报
   */
  async updateEventStatus(
    circleId: string,
    eventId: string,
    status: 'OPEN' | 'ACKED' | 'RESOLVED',
    note?: string,
    triggeredByUserId?: string,
  ): Promise<{ updated: boolean; eventId: string; status: string; updatedAt: string; commandId?: string }> {
    const ev = await this.edgeRepo.findOne({ where: { circleId, eventId } });
    if (!ev) {
      return null as any; // Will be handled by controller
    }

    // ========================================================================
    // [临时补丁 - TODO Phase 5d 移除]
    // 直接修改 threatState，违反 "Edge decides state" 原则
    // 保留原因：提供即时用户反馈，作为命令通道的兜底
    // 风险：Edge 重发事件可能覆盖此修改（当前可接受）
    // ========================================================================
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
    // ========================================================================
    // [临时补丁结束]
    // ========================================================================

    let commandId: string | undefined;

    // [正确流程] 当 App 请求 RESOLVED 时，创建 Edge 命令
    if (status === 'RESOLVED' && ev.threatState === 'TRIGGERED') {
      try {
        // 从 summaryJson 中获取 entryPointId
        const entryPointId = (ev.summaryJson as any)?.entryPointId;
        
        const command = await this.commandsService.createCommand({
          circleId,
          edgeInstanceId: ev.edgeInstanceId,
          commandType: 'resolve',
          commandPayload: {
            eventId,
            entryPointId,
          },
          triggeredByUserId,
          eventId,
        });
        
        commandId = command.id;
        this.logger.log(
          `Created resolve command: ${commandId} for event ${eventId} edge=${ev.edgeInstanceId}`,
        );
      } catch (error) {
        // 命令创建失败不应影响状态更新
        this.logger.error(
          `Failed to create resolve command for event ${eventId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return {
      updated,
      eventId,
      status,
      updatedAt: now.toISOString(),
      commandId,
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
   * Step 2 behavior:
   *  - Always store raw landing row (audit/debug).
   *  - Upsert authoritative snapshot into ng_edge_events with sequence + timestamp rules.
   */
  async storeSummaryUpsert(payload: EdgeEventSummaryUpsertV77): Promise<EdgeSummaryUpsertResult> {
    const incomingSeq = typeof payload.sequence === 'number' ? payload.sequence : 0;
    const incomingUpdatedAt = new Date(payload.updatedAt);
    const payloadHash = sha256Hex(stableStringify(payload));

    const result: EdgeSummaryUpsertResult = await this.dataSource.transaction(async (manager) => {
      // 1) Raw landing write (always).
      const rawRow = this.rawRepo.create({
        circleId: payload.circleId,
        eventId: payload.eventId,
        edgeInstanceId: payload.edgeInstanceId,
        threatState: payload.threatState,
        edgeUpdatedAt: incomingUpdatedAt,
        payload,
      });
      await manager.getRepository(NgEdgeEventSummaryRaw).save(rawRow);

      // 2) Authoritative snapshot upsert.
      const repo = manager.getRepository(NgEdgeEvent);
      const audit = manager.getRepository(NgEdgeIngestAudit);
      const existing = await repo.findOne({
        where: { circleId: payload.circleId, eventId: payload.eventId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!existing) {
        const created = repo.create({
          circleId: payload.circleId,
          eventId: payload.eventId,
          edgeInstanceId: payload.edgeInstanceId,
          threatState: payload.threatState,
          triggerReason: (payload as any).triggerReason ?? null,
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
        return { applied: true, reason: 'applied' };
      }

      const storedSeq = Number(existing.lastSequence ?? '0');

      // Step 3: strong retry-dedup for same-sequence identical payload.
      if (incomingSeq === storedSeq && existing.lastPayloadHash && existing.lastPayloadHash === payloadHash) {
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
        return { applied: false, reason: 'duplicate_payload' };
      }

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
        return { applied: false, reason: 'stale_sequence' };
      }

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
          return { applied: false, reason: 'stale_timestamp' };
        }
      }

      // Apply update.
      existing.edgeInstanceId = payload.edgeInstanceId;
      existing.threatState = payload.threatState;
      existing.triggerReason = (payload as any).triggerReason ?? null;
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

      return { applied: true, reason: 'applied' };
    });

    // 事件应用成功后，检查是否需要触发通知
    if (result.applied) {
      await this.maybeCreateNotification(payload);
    }

    return result;
  }

  /**
   * 检查是否需要为该事件创建通知
   * 
   * 当前支持：
   * - LOGISTICS 工作流 + delivery_detected 触发原因 → 快递到达通知
   * - SECURITY/SECURITY_HEAVY 工作流或有 threatState 的事件 → 安全警报通知
   * 
   * v7.7.1 Home Mode 静默规则：
   * - HOME 模式下只有 TRIGGERED 或 glass_break 才推送通知
   * - PRE_L1/PRE_L2/PENDING/门开关 在 HOME 模式下不推送（避免打扰）
   * - 所有事件仍然记录到数据库，App 可查询
   */
  private async maybeCreateNotification(payload: EdgeEventSummaryUpsertV77): Promise<void> {
    const workflowClass = (payload as any).workflowClass as string | undefined;
    const triggerReason = payload.triggerReason;
    const threatState = payload.threatState;
    const mode = (payload as any).mode as string | undefined;

    this.logger.log(
      `maybeCreateNotification: eventId=${payload.eventId} mode=${mode} workflowClass=${workflowClass} threatState=${threatState} triggerReason=${triggerReason}`
    );

    try {
      // 获取 Circle owner
      const ownerUserId = await this.circlesService.getCircleOwner(payload.circleId);
      if (!ownerUserId) {
        this.logger.log(`No owner found for circle ${payload.circleId}, skipping notification`);
        return;
      }

      // ========================================================================
      // v7.7.1 Home Mode 静默规则
      // HOME 模式下只有强安全事件和快递事件才推送通知，其他事件静默记录
      // ========================================================================
      if (mode?.toLowerCase() === 'home') {
        // Home 模式下允许推送的情况:
        // 1. TRIGGERED 状态（强安全事件，如入侵警报）
        // 2. glass_break 触发原因（玻璃破碎，强证据）
        // 3. LOGISTICS 快递事件（用户在家也想收到快递通知）
        const isStrongSecurityEvent = 
          threatState === 'TRIGGERED' || 
          triggerReason === 'glass_break';
        
        const isLogisticsEvent = 
          workflowClass === 'LOGISTICS' && 
          triggerReason === 'delivery_detected';
        
        if (!isStrongSecurityEvent && !isLogisticsEvent) {
          this.logger.log(
            `Home mode: skipping notification for threatState=${threatState} triggerReason=${triggerReason} (silent recording)`
          );
          return;
        }
        
        this.logger.log(
          `Home mode: allowing notification (strongSecurity=${isStrongSecurityEvent}, logistics=${isLogisticsEvent})`
        );
      }
      // ========================================================================

      // 1. 处理 LOGISTICS 快递事件
      if (workflowClass === 'LOGISTICS' && triggerReason === 'delivery_detected') {
        // Home 模式下快递通知也静默（已在上面处理）
        await this.notificationsService.createParcelNotification({
          userId: ownerUserId,
          circleId: payload.circleId,
          eventId: payload.eventId,
          edgeInstanceId: payload.edgeInstanceId,
          entryPointId: (payload as any).entryPointId,
        });
        this.logger.log(`Created parcel notification for event ${payload.eventId}`);
        return;
      }

      // 2. 处理 SECURITY 安全事件
      const isSecurityWorkflow = workflowClass?.startsWith('SECURITY');
      const notifiableStates = ['TRIGGERED', 'PENDING', 'PRE', 'PRE_L1', 'PRE_L2', 'PRE_L3'];
      
      if (isSecurityWorkflow || (threatState && notifiableStates.includes(threatState))) {
        if (threatState && notifiableStates.includes(threatState)) {
          await this.notificationsService.createSecurityNotification({
            userId: ownerUserId,
            circleId: payload.circleId,
            eventId: payload.eventId,
            edgeInstanceId: payload.edgeInstanceId,
            entryPointId: (payload as any).entryPointId,
            alarmState: threatState,
            title: (payload as any).title,
          });
          this.logger.log(`Created security notification for event ${payload.eventId} threatState=${threatState}`);
          return;
        }
      }

      this.logger.debug(`No notification needed for event ${payload.eventId}`);

    } catch (error) {
      // 通知创建失败不应影响事件处理
      this.logger.error(`Failed to create notification for event ${payload.eventId}`, error instanceof Error ? error.stack : String(error));
    }
  }
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}
