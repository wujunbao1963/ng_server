import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, DataSource } from 'typeorm';
import * as crypto from 'crypto';
import {
  NgWitnessAlert,
  WitnessAlertType,
  WitnessAlertPriority
} from './ng-witness-alert.entity';
import { OutboxService, OutboxMessageType } from '../common/outbox';

// ============================================================================
// DTOs
// ============================================================================

export interface CreateWitnessAlertDto {
  userId: string;
  type: WitnessAlertType;
  title: string;
  body?: string;
  priority?: WitnessAlertPriority;
  circleId?: string;
  taskId?: string;
  eventId?: string;
  actorUserId?: string;
  actorRole?: string;
  data?: Record<string, any>;
  expiresAt?: Date;
  /** 是否同时发送推送通知，默认 true */
  push?: boolean;
}

export interface WitnessAlertListOptions {
  unreadOnly?: boolean;
  types?: WitnessAlertType[];
  circleId?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class WitnessAlertsService {
  private readonly logger = new Logger(WitnessAlertsService.name);

  constructor(
    @InjectRepository(NgWitnessAlert)
    private readonly alertsRepo: Repository<NgWitnessAlert>,
    private readonly outboxService: OutboxService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 创建 Alert（带可选推送）
   *
   * 使用事务保证 alert 记录与 outbox 推送消息的原子性。
   */
  async create(dto: CreateWitnessAlertDto): Promise<NgWitnessAlert> {
    const alertId = crypto.randomUUID();
    const priority = dto.priority ?? WitnessAlertPriority.NORMAL;
    const shouldPush = dto.push !== false && priority !== WitnessAlertPriority.LOW;

    return this.dataSource.transaction(async (manager) => {
      const alertsRepo = manager.getRepository(NgWitnessAlert);

      const alert = alertsRepo.create({
        id: alertId,
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        body: dto.body ?? null,
        priority,
        circleId: dto.circleId ?? null,
        taskId: dto.taskId ?? null,
        eventId: dto.eventId ?? null,
        actorUserId: dto.actorUserId ?? null,
        actorRole: dto.actorRole ?? null,
        data: dto.data ?? null,
        read: false,
        readAt: null,
        expiresAt: dto.expiresAt ?? null,
      });

      await alertsRepo.save(alert);

      if (shouldPush) {
        await this.outboxService.enqueue({
          messageType: OutboxMessageType.PUSH_NOTIFICATION,
          payload: {
            userId: dto.userId,
            title: dto.title,
            body: dto.body ?? '',
            data: {
              route: 'witness_alert',
              alertId,
              alertType: dto.type,
              taskId: dto.taskId ?? null,
              circleId: dto.circleId ?? null,
            },
          },
          aggregateId: alertId,
          aggregateType: 'WitnessAlert',
          idempotencyKey: `witness-alert:${alertId}`,
        }, manager);
      }

      this.logger.log(`Created alert: ${dto.type} for user ${dto.userId}${shouldPush ? ' (with push)' : ''}`);

      return alert;
    });
  }

  /**
   * 批量创建 Alert（发送给多个用户，带可选推送）
   *
   * 使用事务保证所有 alert + outbox 消息的原子性。
   */
  async createBatch(
    userIds: string[],
    dto: Omit<CreateWitnessAlertDto, 'userId'>,
  ): Promise<NgWitnessAlert[]> {
    if (userIds.length === 0) return [];

    const priority = dto.priority ?? WitnessAlertPriority.NORMAL;
    const shouldPush = dto.push !== false && priority !== WitnessAlertPriority.LOW;

    return this.dataSource.transaction(async (manager) => {
      const alertsRepo = manager.getRepository(NgWitnessAlert);

      const alerts = userIds.map(userId => {
        const alertId = crypto.randomUUID();
        return alertsRepo.create({
          id: alertId,
          userId,
          type: dto.type,
          title: dto.title,
          body: dto.body ?? null,
          priority,
          circleId: dto.circleId ?? null,
          taskId: dto.taskId ?? null,
          eventId: dto.eventId ?? null,
          actorUserId: dto.actorUserId ?? null,
          actorRole: dto.actorRole ?? null,
          data: dto.data ?? null,
          read: false,
          readAt: null,
          expiresAt: dto.expiresAt ?? null,
        });
      });

      await alertsRepo.save(alerts);

      if (shouldPush) {
        for (const alert of alerts) {
          await this.outboxService.enqueue({
            messageType: OutboxMessageType.PUSH_NOTIFICATION,
            payload: {
              userId: alert.userId,
              title: dto.title,
              body: dto.body ?? '',
              data: {
                route: 'witness_alert',
                alertId: alert.id,
                alertType: dto.type,
                taskId: dto.taskId ?? null,
                circleId: dto.circleId ?? null,
              },
            },
            aggregateId: alert.id,
            aggregateType: 'WitnessAlert',
            idempotencyKey: `witness-alert:${alert.id}`,
          }, manager);
        }
      }

      this.logger.log(`Created batch: ${dto.type} for ${userIds.length} users${shouldPush ? ' (with push)' : ''}`);

      return alerts;
    });
  }

  /**
   * 获取用户 Alert 列表
   */
  async listForUser(
    userId: string,
    options?: WitnessAlertListOptions,
  ): Promise<{ alerts: NgWitnessAlert[]; total: number; unreadCount: number }> {
    const where: any = { userId };

    if (options?.unreadOnly) {
      where.read = false;
    }

    if (options?.types && options.types.length > 0) {
      where.type = options.types;
    }

    if (options?.circleId) {
      where.circleId = options.circleId;
    }

    const [alerts, total] = await this.alertsRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });

    // 获取未读数量
    const unreadCount = await this.alertsRepo.count({
      where: { userId, read: false },
    });

    return { alerts, total, unreadCount };
  }

  /**
   * 获取未读 Alert 数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.alertsRepo.count({
      where: { userId, read: false },
    });
  }

  /**
   * 标记 Alert 为已读
   */
  async markAsRead(userId: string, alertId: string): Promise<void> {
    await this.alertsRepo.update(
      { id: alertId, userId },
      { read: true, readAt: new Date() },
    );
  }

  /**
   * 标记所有 Alert 为已读
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.alertsRepo.update(
      { userId, read: false },
      { read: true, readAt: new Date() },
    );
    return result.affected ?? 0;
  }

  /**
   * 删除 Alert
   */
  async delete(userId: string, alertId: string): Promise<void> {
    await this.alertsRepo.delete({ id: alertId, userId });
  }

  /**
   * 清理过期 Alert
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.alertsRepo.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected ?? 0;
  }

  // ==========================================================================
  // Witness Task 专用 Alert 方法
  // ==========================================================================

  /**
   * Alert: 任务已发布 (通知所有 Witness)
   */
  async notifyTaskOffered(
    witnessUserIds: string[],
    task: { id: string; circleId: string; eventId?: string | null; title: string },
    creatorUserId: string,
  ): Promise<NgWitnessAlert[]> {
    if (witnessUserIds.length === 0) return [];

    return this.createBatch(witnessUserIds, {
      type: WitnessAlertType.TASK_CREATED,
      title: '有邻居需要协助',
      body: `「${task.title}」需要协助，请查看详情。`,
      priority: WitnessAlertPriority.HIGH,
      circleId: task.circleId,
      taskId: task.id,
      eventId: task.eventId ?? undefined,
      actorUserId: creatorUserId,
      actorRole: 'owner',
    });
  }

  /**
   * Alert: 任务被领取
   */
  async notifyTaskClaimed(
    creatorUserId: string,
    task: { id: string; circleId: string; eventId?: string | null; title: string },
    witnessUserId: string,
  ): Promise<NgWitnessAlert> {
    return this.create({
      userId: creatorUserId,
      type: WitnessAlertType.TASK_CLAIMED,
      title: '协助任务已被领取',
      body: `您的任务「${task.title}」已被领取，协助者正在前往现场。`,
      priority: WitnessAlertPriority.NORMAL,
      circleId: task.circleId,
      taskId: task.id,
      eventId: task.eventId ?? undefined,
      actorUserId: witnessUserId,
      actorRole: 'witness',
    });
  }

  /**
   * Alert: Witness 到达现场
   */
  async notifyTaskArrived(
    creatorUserId: string,
    task: { id: string; circleId: string; eventId?: string | null; title: string },
    witnessUserId: string,
  ): Promise<NgWitnessAlert> {
    return this.create({
      userId: creatorUserId,
      type: WitnessAlertType.TASK_ARRIVED,
      title: '协助者已到达现场',
      body: `协助者已到达「${task.title}」的现场，正在查看情况。`,
      priority: WitnessAlertPriority.HIGH,
      circleId: task.circleId,
      taskId: task.id,
      eventId: task.eventId ?? undefined,
      actorUserId: witnessUserId,
      actorRole: 'witness',
    });
  }

  /**
   * Alert: 报告已提交
   */
  async notifyTaskSubmitted(
    creatorUserId: string,
    task: { id: string; circleId: string; eventId?: string | null; title: string },
    witnessUserId: string,
    conclusion?: string,
  ): Promise<NgWitnessAlert> {
    const conclusionText = conclusion === 'SAFE' ? '现场安全'
      : conclusion === 'ABNORMAL' ? '发现异常'
      : conclusion === 'NEEDS_ACTION' ? '需要进一步行动'
      : '已完成';

    return this.create({
      userId: creatorUserId,
      type: WitnessAlertType.TASK_SUBMITTED,
      title: '协助报告已提交',
      body: `「${task.title}」的协助报告已提交，结论: ${conclusionText}`,
      priority: WitnessAlertPriority.HIGH,
      circleId: task.circleId,
      taskId: task.id,
      eventId: task.eventId ?? undefined,
      actorUserId: witnessUserId,
      actorRole: 'witness',
      data: { conclusion },
    });
  }

  /**
   * Alert: 任务被取消 (通知 Witness)
   */
  async notifyTaskCanceled(
    witnessUserId: string,
    task: { id: string; circleId: string; eventId?: string | null; title: string },
    canceledByUserId: string,
    canceledByRole: string,
    reason?: string,
  ): Promise<NgWitnessAlert> {
    return this.create({
      userId: witnessUserId,
      type: WitnessAlertType.TASK_CANCELED,
      title: '协助任务已取消',
      body: reason
        ? `任务「${task.title}」已被取消，原因: ${reason}`
        : `任务「${task.title}」已被取消`,
      priority: WitnessAlertPriority.HIGH,
      circleId: task.circleId,
      taskId: task.id,
      eventId: task.eventId ?? undefined,
      actorUserId: canceledByUserId,
      actorRole: canceledByRole,
      data: { reason },
    });
  }

  /**
   * Alert: 风险退出 (通知 Creator)
   */
  async notifyTaskRiskAborted(
    creatorUserId: string,
    task: { id: string; circleId: string; eventId?: string | null; title: string },
    witnessUserId: string,
    reason: string,
  ): Promise<NgWitnessAlert> {
    return this.create({
      userId: creatorUserId,
      type: WitnessAlertType.TASK_RISK_ABORTED,
      title: '⚠️ 协助者风险退出',
      body: `协助者因现场风险退出任务「${task.title}」，原因: ${reason}`,
      priority: WitnessAlertPriority.URGENT,
      circleId: task.circleId,
      taskId: task.id,
      eventId: task.eventId ?? undefined,
      actorUserId: witnessUserId,
      actorRole: 'witness',
      data: { reason },
    });
  }

  /**
   * Alert: 任务过期 (通知 Creator)
   */
  async notifyTaskExpired(
    creatorUserId: string,
    task: { id: string; circleId: string; eventId?: string | null; title: string },
  ): Promise<NgWitnessAlert> {
    return this.create({
      userId: creatorUserId,
      type: WitnessAlertType.TASK_EXPIRED,
      title: '协助任务已过期',
      body: `任务「${task.title}」已过期，无人响应。`,
      priority: WitnessAlertPriority.NORMAL,
      circleId: task.circleId,
      taskId: task.id,
      eventId: task.eventId ?? undefined,
    });
  }

  /**
   * Alert: 任务放弃 (通知 Creator)
   */
  async notifyTaskAbandoned(
    creatorUserId: string,
    task: { id: string; circleId: string; eventId?: string | null; title: string },
    witnessUserId: string,
    reason: string,
  ): Promise<NgWitnessAlert> {
    return this.create({
      userId: creatorUserId,
      type: WitnessAlertType.TASK_ABANDONED,
      title: '协助任务已放弃',
      body: `任务「${task.title}」被放弃，原因: ${reason}`,
      priority: WitnessAlertPriority.HIGH,
      circleId: task.circleId,
      taskId: task.id,
      eventId: task.eventId ?? undefined,
      actorUserId: witnessUserId,
      actorRole: 'witness',
      data: { reason },
    });
  }
}
