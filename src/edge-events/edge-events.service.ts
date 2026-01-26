import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { NgEdgeEvent } from './ng-edge-event.entity';
import { NgEdgeEventSummaryRaw } from './ng-edge-event-summary-raw.entity';
import { NgEdgeIngestAudit } from './ng-edge-ingest-audit.entity';
import { NgLedgerEntry } from '../ledger-ingest/ng-ledger-entry.entity';
import { stableStringify } from '../common/utils/stable-json';
import { NotificationsService } from '../notifications/notifications.service';
import { CirclesService } from '../circles/circles.service';
import { EdgeCommandsService } from './edge-commands.service';
import { EventViewModelService, EventViewModel } from './event-viewmodel.service';

/**
 * v7.7 EventSummaryUpsert schema
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
  [k: string]: unknown;
};

/**
 * v7.7.1 EventSummaryUpsert schema extension
 * 
 * 根据 NG_EVIDENCE_NOTIFICATION_ENGINEERING_SPEC_v1 §6.2:
 * - notificationEligible: Edge 决定是否应该发送通知
 * - notificationHint: Edge 提供的额外上下文（用于审计/调试）
 * 
 * 关键原则：
 * > Edge is the sole authority for notification eligibility.
 * > Server executes Edge's decision; Server does NOT interpret `mode` to make suppression decisions.
 */
export type EdgeEventSummaryUpsertV771 = EdgeEventSummaryUpsertV77 & {
  // Edge-authoritative notification decision (v7.7.1)
  notificationEligible?: boolean;
  notificationHint?: {
    suppressReason?: 'MODE_HOME' | 'MODE_DISARM' | 'BELOW_THRESHOLD' | null;
    preLevel?: 'L0' | 'L1' | 'L2';
  };
  
  // Evidence capture metadata (v7.7.1 Phase 3+)
  evidenceCapture?: {
    sessionCount?: number;
    clipCount?: number;
    anchorCount?: number;
    hasPresenceSession?: boolean;
  };
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
    @InjectRepository(NgLedgerEntry)
    private readonly ledgerRepo: Repository<NgLedgerEntry>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
    private readonly circlesService: CirclesService,
    private readonly commandsService: EdgeCommandsService,
    private readonly viewModelService: EventViewModelService,
  ) {}

  /**
   * List edge events for a circle (App read API)
   * 
   * v7.7.1 Home Mode 静默规则：
   * - Home 模式下的非强安全事件不在列表中显示
   * - 强安全事件 = TRIGGERED 状态或 glass_break 触发
   * - 这些事件仍然记录在数据库中，可通过管理接口查询
   * 
   * v7.7.2 ViewModel 格式：
   * - 返回符合 NG_EVENT_VIEWMODEL_SCHEMA_v7.7 的数据
   * - 所有文案由后端生成，前端纯渲染
   */
  async listEvents(circleId: string, limit: number = 50): Promise<{ items: EventViewModel[]; nextCursor: string | null }> {
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

    // 转换为 ViewModel 格式
    const rawEvents = filteredEvents.slice(0, limit).map((ev) => {
      const summary = ev.summaryJson as Record<string, unknown> | undefined;
      return {
        eventId: ev.eventId,
        edgeInstanceId: ev.edgeInstanceId,
        threatState: ev.threatState,
        triggerReason: ev.triggerReason,
        edgeUpdatedAt: ev.edgeUpdatedAt,
        summaryJson: summary,
        status: summary?.appStatus as string | undefined,  // 从 summaryJson 读取 app 状态
      };
    });

    const items = await this.viewModelService.toViewModelList(rawEvents, circleId);

    return { items, nextCursor: null };
  }

  /**
   * Get single edge event (App read API with ViewModel format)
   */
  async getEvent(circleId: string, eventId: string): Promise<EventViewModel | null> {
    const ev = await this.edgeRepo.findOne({ where: { circleId, eventId } });
    if (!ev) {
      return null;
    }

    const summary = ev.summaryJson as Record<string, unknown> | undefined;
    return this.viewModelService.toViewModel(
      {
        eventId: ev.eventId,
        edgeInstanceId: ev.edgeInstanceId,
        threatState: ev.threatState,
        triggerReason: ev.triggerReason,
        edgeUpdatedAt: ev.edgeUpdatedAt,
        summaryJson: summary,
        status: summary?.appStatus as string | undefined,  // 从 summaryJson 读取 app 状态
      },
      circleId,
      { includeDebug: false },
    );
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

    const now = new Date();
    const currentSummary = (ev.summaryJson as Record<string, unknown>) ?? {};
    
    // ========================================================================
    // ACKED 状态：仅更新 summaryJson 中的 appStatus，不修改 threatState
    // 用于 PRE 事件的"已查看"标记
    // ========================================================================
    if (status === 'ACKED') {
      const newSummary = { ...currentSummary, appStatus: 'ACKED' };
      await this.edgeRepo.update(
        { circleId, eventId },
        { 
          summaryJson: newSummary,
          edgeUpdatedAt: now,
        }
      );
      return {
        updated: true,
        eventId,
        status,
        updatedAt: now.toISOString(),
      };
    }

    // ========================================================================
    // [临时补丁 - TODO Phase 5d 移除]
    // 直接修改 threatState，违反 "Edge decides state" 原则
    // 保留原因：提供即时用户反馈，作为命令通道的兜底
    // 风险：Edge 重发事件可能覆盖此修改（当前可接受）
    // ========================================================================
    const newThreatState = status === 'RESOLVED' ? 'RESOLVED' : ev.threatState;
    
    const updated = ev.threatState !== newThreatState;
    
    if (updated) {
      const newSummary = { ...currentSummary, appStatus: status };
      await this.edgeRepo.update(
        { circleId, eventId },
        { 
          threatState: newThreatState,
          summaryJson: newSummary,
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
        
        // v7.7.1: 提取通知决策字段用于审计
        const notificationEligible = (payload as EdgeEventSummaryUpsertV771).notificationEligible ?? null;
        const notificationHint = (payload as EdgeEventSummaryUpsertV771).notificationHint;
        
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
          notificationEligible,
          notificationSuppressReason: notificationHint?.suppressReason ?? null,
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

      // v7.7.1: 提取通知决策字段用于审计
      const notificationEligible = (payload as EdgeEventSummaryUpsertV771).notificationEligible ?? null;
      const notificationHint = (payload as EdgeEventSummaryUpsertV771).notificationHint;

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
        notificationEligible,
        notificationSuppressReason: notificationHint?.suppressReason ?? null,
      });

      return { applied: true, reason: 'applied' };
    });

    // 事件应用成功后，检查是否需要触发通知和写入 Ledger
    if (result.applied) {
      await this.maybeCreateNotification(payload);
      
      // ========================================================================
      // v8: 同步写入 Ledger（审计记录）
      // ========================================================================
      await this.writeLedgerEntry(payload, incomingSeq);
    }

    return result;
  }

  /**
   * 写入 Ledger 条目（审计记录）
   * 
   * 根据 NG_INTERFACE_CONTRACT_MASTER_v8 §B.3.1 FSMTransition
   * 当 EventSummary 被应用时，同步写入一条 Ledger 记录
   */
  private async writeLedgerEntry(
    payload: EdgeEventSummaryUpsertV77,
    sequence: number,
  ): Promise<void> {
    try {
      const idempotencyKey = `${payload.edgeInstanceId}:${payload.eventId}:summary:${sequence}`;
      
      // 检查是否已存在（幂等）
      const existing = await this.ledgerRepo.findOne({
        where: { idempotencyKey },
      });
      if (existing) {
        this.logger.debug(`Ledger entry already exists: ${idempotencyKey}`);
        return;
      }

      const entry = this.ledgerRepo.create({
        id: `${payload.edgeInstanceId}:${sequence}`,
        edgeInstanceId: payload.edgeInstanceId,
        circleId: payload.circleId,
        ledgerSeq: sequence,
        entryType: 'FSM_TRANSITION',
        eventId: payload.eventId,
        actorId: null,
        actorRole: null,
        deviceTime: new Date(payload.updatedAt),
        monoTime: null,
        timeQuality: 'SYNCED',
        payload: {
          fromState: null,  // Edge 未提供
          toState: payload.threatState,
          mode: (payload as any).mode ?? null,
          reason: payload.triggerReason ?? 'none',
          entryPointId: (payload as any).entryPointId ?? null,
          workflowClass: (payload as any).workflowClass ?? null,
        },
        contractVersion: 'ng.edge.server/8.0',
        edgeSpecVersion: payload.schemaVersion,
        idempotencyKey,
      });

      await this.ledgerRepo.save(entry);
      this.logger.log(`Ledger entry created: ${idempotencyKey}`);
    } catch (error) {
      // Ledger 写入失败不应影响主流程
      this.logger.error(
        `Failed to write ledger entry for ${payload.eventId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * 检查是否需要为该事件创建通知
   * 
   * v7.7.1 Edge-Authoritative Notification (NG_EVIDENCE_NOTIFICATION_ENGINEERING_SPEC_v1 §6.2):
   * - 如果 Edge 发送了 notificationEligible 字段，Server 直接遵循 Edge 的决定
   * - 如果 notificationEligible 不存在（老版本 Edge），回退到 Server 端评估（向后兼容）
   * 
   * 关键原则：
   * > Edge is the sole authority for notification eligibility.
   * > Server executes Edge's decision; Server does NOT interpret `mode` to make suppression decisions.
   * 
   * 当前支持：
   * - LOGISTICS 工作流 + delivery_detected 触发原因 → 快递到达通知
   * - SECURITY/SECURITY_HEAVY 工作流或有 threatState 的事件 → 安全警报通知
   */
  private async maybeCreateNotification(payload: EdgeEventSummaryUpsertV77 | EdgeEventSummaryUpsertV771): Promise<void> {
    const workflowClass = (payload as any).workflowClass as string | undefined;
    const triggerReason = payload.triggerReason;
    const threatState = payload.threatState;
    const mode = (payload as any).mode as string | undefined;

    // ========================================================================
    // v7.7.1: 检查 Edge 的 notificationEligible 决定
    // ========================================================================
    const notificationEligible = (payload as EdgeEventSummaryUpsertV771).notificationEligible;
    const notificationHint = (payload as EdgeEventSummaryUpsertV771).notificationHint;

    this.logger.log(
      `maybeCreateNotification: eventId=${payload.eventId} mode=${mode} workflowClass=${workflowClass} ` +
      `threatState=${threatState} triggerReason=${triggerReason} ` +
      `notificationEligible=${notificationEligible} suppressReason=${notificationHint?.suppressReason}`
    );

    // v7.7.1: 如果 Edge 明确设置了 notificationEligible=false，直接跳过
    if (notificationEligible === false) {
      this.logger.log(
        `Notification suppressed by Edge decision: eventId=${payload.eventId} ` +
        `reason=${notificationHint?.suppressReason || 'EDGE_DECIDED'}`
      );
      return;
    }

    try {
      // 获取 Circle owner
      const ownerUserId = await this.circlesService.getCircleOwner(payload.circleId);
      if (!ownerUserId) {
        this.logger.log(`No owner found for circle ${payload.circleId}, skipping notification`);
        return;
      }

      // ========================================================================
      // v7.7.1: 如果 Edge 没有发送 notificationEligible（老版本 Edge），
      // 回退到 Server 端评估（向后兼容）
      // ========================================================================
      if (notificationEligible === undefined) {
        // Home Mode 静默规则（Server 端回退逻辑，未来应由 Edge 控制）
        if (mode?.toLowerCase() === 'home') {
          const isStrongSecurityEvent = 
            threatState === 'TRIGGERED' || 
            triggerReason === 'glass_break';
          
          const isLogisticsEvent = 
            workflowClass === 'LOGISTICS' && 
            triggerReason === 'delivery_detected';
          
          if (!isStrongSecurityEvent && !isLogisticsEvent) {
            this.logger.log(
              `[Fallback] Home mode: skipping notification for threatState=${threatState} ` +
              `triggerReason=${triggerReason} (Edge did not send notificationEligible)`
            );
            return;
          }
        }
      }
      // ========================================================================

      // 1. 处理 LOGISTICS 快递事件
      if (workflowClass === 'LOGISTICS' && triggerReason === 'delivery_detected') {
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
