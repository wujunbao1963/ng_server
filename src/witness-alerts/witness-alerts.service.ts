import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as crypto from 'crypto';
import { 
  NgWitnessAlert, 
  WitnessAlertType, 
  WitnessAlertPriority 
} from './ng-witness-alert.entity';

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
  constructor(
    @InjectRepository(NgWitnessAlert)
    private readonly alertsRepo: Repository<NgWitnessAlert>,
  ) {}

  /**
   * 创建 Alert
   */
  async create(dto: CreateWitnessAlertDto): Promise<NgWitnessAlert> {
    const alert = this.alertsRepo.create({
      id: crypto.randomUUID(),
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      body: dto.body ?? null,
      priority: dto.priority ?? WitnessAlertPriority.NORMAL,
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

    await this.alertsRepo.save(alert);
    
    // TODO: 触发实时推送 (WebSocket / Push)
    console.log(`[WitnessAlert] Created: ${dto.type} for user ${dto.userId}`);
    
    return alert;
  }

  /**
   * 批量创建 Alert (发送给多个用户)
   */
  async createBatch(
    userIds: string[],
    dto: Omit<CreateWitnessAlertDto, 'userId'>,
  ): Promise<NgWitnessAlert[]> {
    const alerts = userIds.map(userId => 
      this.alertsRepo.create({
        id: crypto.randomUUID(),
        userId,
        type: dto.type,
        title: dto.title,
        body: dto.body ?? null,
        priority: dto.priority ?? WitnessAlertPriority.NORMAL,
        circleId: dto.circleId ?? null,
        taskId: dto.taskId ?? null,
        eventId: dto.eventId ?? null,
        actorUserId: dto.actorUserId ?? null,
        actorRole: dto.actorRole ?? null,
        data: dto.data ?? null,
        read: false,
        readAt: null,
        expiresAt: dto.expiresAt ?? null,
      })
    );

    await this.alertsRepo.save(alerts);
    
    console.log(`[WitnessAlert] Created batch: ${dto.type} for ${userIds.length} users`);
    
    return alerts;
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
