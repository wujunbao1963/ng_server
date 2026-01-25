import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import {
  NgNotification,
  NgNotificationConfig,
  NgNotificationThrottle,
  NotificationType,
  NotificationPriority,
  NotificationSeverity,
  RoleContext,
  PreLevel,
} from './ng-notification.entity';
import { OutboxService, OutboxMessageType } from '../common/outbox';

/**
 * Edge 事件输入
 */
export interface EdgeEventInput {
  eventId: string;
  circleId: string;  // = houseId
  edgeInstanceId: string;
  threatState: string;
  triggerReason?: string;
  workflowClass?: string;
  mode?: string;
  entryPointId?: string;
  preLevel?: PreLevel;
  entryDelaySec?: number;
}

/**
 * 通知评估结果
 */
export interface NotificationEvaluation {
  shouldNotify: boolean;
  notificationType?: NotificationType;
  priority?: NotificationPriority;
  severity?: NotificationSeverity;
  preLevel?: PreLevel;
  recipients?: RecipientInfo[];
  throttled?: boolean;
  deferred?: boolean;
  deferredUntil?: Date;
  reason?: string;
}

/**
 * 接收者信息
 */
export interface RecipientInfo {
  userId: string;
  role: RoleContext;
  delaySec?: number;
}

/**
 * 通知内容
 */
export interface NotificationContent {
  title: string;
  body: string;
  emoji: string;
}

/**
 * NotificationEvaluator - 通知评估器
 * 
 * 根据 NG_NOTIFICATION_SUBSYSTEM_SPEC_v1.1 实现：
 * - Edge State → Notification Mapping (§3.1)
 * - Priority Assignment (§5.1)
 * - Role Distribution (§4.1)
 * - Throttling (§5.3)
 * - Quiet Hours (§5.4)
 */
@Injectable()
export class NotificationEvaluator {
  private readonly logger = new Logger(NotificationEvaluator.name);

  constructor(
    @InjectRepository(NgNotification)
    private readonly notificationsRepo: Repository<NgNotification>,
    @InjectRepository(NgNotificationConfig)
    private readonly configRepo: Repository<NgNotificationConfig>,
    @InjectRepository(NgNotificationThrottle)
    private readonly throttleRepo: Repository<NgNotificationThrottle>,
    private readonly outboxService: OutboxService,
    private readonly dataSource: DataSource,
  ) {}

  // =========================================================================
  // 主入口：评估 Edge 事件是否需要通知
  // =========================================================================

  /**
   * 评估 Edge 事件并决定是否需要发送通知
   */
  async evaluateEdgeEvent(input: EdgeEventInput): Promise<NotificationEvaluation> {
    const { threatState, workflowClass, triggerReason, mode } = input;
    const houseId = input.circleId;

    this.logger.log(
      `Evaluating event: eventId=${input.eventId} threatState=${threatState} ` +
      `workflowClass=${workflowClass} mode=${mode}`
    );

    // 1. 确定通知类型
    const notificationType = this.mapToNotificationType(input);
    if (!notificationType) {
      return { shouldNotify: false, reason: 'no_matching_type' };
    }

    // 2. Home 模式静默规则
    if (mode?.toLowerCase() === 'home') {
      const isAllowed = this.isAllowedInHomeMode(threatState, triggerReason, workflowClass);
      if (!isAllowed) {
        return { shouldNotify: false, reason: 'home_mode_silent' };
      }
    }

    // 3. PRE-L0 静默
    if (notificationType === 'SECURITY_PRE_ALERT' && input.preLevel === 'L0') {
      return { shouldNotify: false, reason: 'pre_l0_silent' };
    }

    // 4. 获取配置
    const config = await this.getOrCreateConfig(houseId);

    // 5. 节流检查
    const throttled = await this.checkThrottle(houseId, input.eventId, notificationType, config);
    if (throttled) {
      return { shouldNotify: false, throttled: true, reason: 'throttled' };
    }

    // 6. Quiet Hours 检查
    const quietHoursResult = this.checkQuietHours(config, notificationType);
    if (quietHoursResult.deferred) {
      return {
        shouldNotify: true,
        notificationType,
        priority: this.getPriority(notificationType, threatState),
        severity: this.getSeverity(notificationType, threatState),
        preLevel: input.preLevel,
        deferred: true,
        deferredUntil: quietHoursResult.deferredUntil,
        reason: 'quiet_hours_deferred',
      };
    }

    // 7. 返回评估结果
    return {
      shouldNotify: true,
      notificationType,
      priority: this.getPriority(notificationType, threatState),
      severity: this.getSeverity(notificationType, threatState),
      preLevel: input.preLevel,
      reason: 'approved',
    };
  }

  // =========================================================================
  // Edge State → Notification Type Mapping (§3.1)
  // =========================================================================

  private mapToNotificationType(input: EdgeEventInput): NotificationType | null {
    const { threatState, workflowClass, triggerReason } = input;

    // LOGISTICS 快递事件
    if (workflowClass === 'LOGISTICS' && triggerReason === 'delivery_detected') {
      return 'LOGISTICS_DELIVERY';
    }

    // Life Safety
    if (triggerReason === 'life_safety') {
      return 'LIFE_SAFETY_ALARM';
    }

    // Security 状态映射
    switch (threatState) {
      case 'TRIGGERED':
        return 'SECURITY_TRIGGERED_ALARM';
      case 'PENDING':
        return 'SECURITY_PENDING_ALERT';
      case 'PRE':
      case 'PRE_L1':
      case 'PRE_L2':
      case 'PRE_L3':
        return 'SECURITY_PRE_ALERT';
      default:
        break;
    }

    // Tamper
    if (triggerReason?.includes('tamper')) {
      return 'SECURITY_TAMPER_ALERT';
    }

    // 没有匹配的类型
    return null;
  }

  // =========================================================================
  // Priority Assignment (§5.1)
  // =========================================================================

  private getPriority(type: NotificationType, threatState?: string): NotificationPriority {
    switch (type) {
      case 'LIFE_SAFETY_ALARM':
        return 'CRITICAL';
      case 'SECURITY_TRIGGERED_ALARM':
        return 'CRITICAL';
      case 'SECURITY_PENDING_ALERT':
        return 'HIGH';
      case 'SECURITY_TAMPER_ALERT':
        return 'HIGH';
      case 'SECURITY_PRE_ALERT':
        return 'NORMAL';
      case 'LOGISTICS_DELIVERY':
        return 'LOW';
      default:
        return 'NORMAL';
    }
  }

  private getSeverity(type: NotificationType, threatState?: string): NotificationSeverity {
    switch (type) {
      case 'LIFE_SAFETY_ALARM':
      case 'SECURITY_TRIGGERED_ALARM':
        return 'critical';
      case 'SECURITY_PENDING_ALERT':
      case 'SECURITY_TAMPER_ALERT':
        return 'warning';
      default:
        return 'info';
    }
  }

  // =========================================================================
  // Home Mode Rules
  // =========================================================================

  private isAllowedInHomeMode(
    threatState?: string,
    triggerReason?: string,
    workflowClass?: string,
  ): boolean {
    // 强安全事件允许
    if (threatState === 'TRIGGERED' || triggerReason === 'glass_break') {
      return true;
    }
    // 快递事件允许
    if (workflowClass === 'LOGISTICS' && triggerReason === 'delivery_detected') {
      return true;
    }
    return false;
  }

  // =========================================================================
  // Throttling (§5.3)
  // =========================================================================

  private async checkThrottle(
    houseId: string,
    eventId: string,
    type: NotificationType,
    config: NgNotificationConfig,
  ): Promise<boolean> {
    // PRE 事件按 eventId 节流
    if (type === 'SECURITY_PRE_ALERT') {
      const throttleKey = `PRE:${eventId}`;
      const windowSec = config.preThrottleWindowSec;
      const maxCount = config.preThrottleMax;

      return this.isThrottled(houseId, throttleKey, windowSec, maxCount);
    }

    // 其他类型暂不节流
    return false;
  }

  private async isThrottled(
    houseId: string,
    throttleKey: string,
    windowSec: number,
    maxCount: number,
  ): Promise<boolean> {
    const windowStart = new Date(Date.now() - windowSec * 1000);

    const existing = await this.throttleRepo.findOne({
      where: { houseId, throttleKey },
    });

    if (!existing) {
      // 创建新记录
      await this.throttleRepo.save({
        houseId,
        throttleKey,
        notificationCount: 1,
        windowStart: new Date(),
        lastNotificationAt: new Date(),
      });
      return false;
    }

    // 检查窗口是否过期
    if (existing.windowStart < windowStart) {
      // 重置窗口
      existing.notificationCount = 1;
      existing.windowStart = new Date();
      existing.lastNotificationAt = new Date();
      await this.throttleRepo.save(existing);
      return false;
    }

    // 检查计数
    if (existing.notificationCount >= maxCount) {
      this.logger.debug(`Throttled: ${throttleKey} count=${existing.notificationCount}/${maxCount}`);
      return true;
    }

    // 增加计数
    existing.notificationCount += 1;
    existing.lastNotificationAt = new Date();
    await this.throttleRepo.save(existing);
    return false;
  }

  // =========================================================================
  // Quiet Hours (§5.4)
  // =========================================================================

  private checkQuietHours(
    config: NgNotificationConfig,
    type: NotificationType,
  ): { deferred: boolean; deferredUntil?: Date } {
    // CRITICAL 优先级可以绕过 Quiet Hours
    const priority = this.getPriority(type);
    if (priority === 'CRITICAL') {
      return { deferred: false };
    }

    if (!config.quietHoursEnabled || !config.quietHoursStart || !config.quietHoursEnd) {
      return { deferred: false };
    }

    // 简化实现：检查当前时间是否在静默时段
    const now = new Date();
    const tz = config.quietHoursTimezone || 'UTC';
    
    // 获取当前时间的小时分钟（简化，假设 UTC）
    const currentTime = now.toISOString().slice(11, 16); // "HH:MM"
    const start = config.quietHoursStart.slice(0, 5);
    const end = config.quietHoursEnd.slice(0, 5);

    let inQuietHours = false;
    if (start <= end) {
      // 同一天内：22:00 - 23:59
      inQuietHours = currentTime >= start && currentTime <= end;
    } else {
      // 跨天：22:00 - 07:00
      inQuietHours = currentTime >= start || currentTime <= end;
    }

    if (inQuietHours) {
      // 计算延迟到什么时候
      const deferredUntil = this.calculateDeferredUntil(end, tz);
      return { deferred: true, deferredUntil };
    }

    return { deferred: false };
  }

  private calculateDeferredUntil(endTime: string, timezone: string): Date {
    // 简化实现：延迟到今天或明天的结束时间
    const now = new Date();
    const [hours, minutes] = endTime.split(':').map(Number);
    
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);
    
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }
    
    return target;
  }

  // =========================================================================
  // Configuration
  // =========================================================================

  private async getOrCreateConfig(houseId: string): Promise<NgNotificationConfig> {
    let config = await this.configRepo.findOne({ where: { houseId } });
    
    if (!config) {
      config = this.configRepo.create({
        houseId,
        quietHoursEnabled: false,
        caretakerAlertMode: 'CONCURRENT',
        caretakerDelaySec: 300,
        preThrottleWindowSec: 120,
        preThrottleMax: 1,
      });
      await this.configRepo.save(config);
    }
    
    return config;
  }

  // =========================================================================
  // 通知内容生成
  // =========================================================================

  generateContent(type: NotificationType, input: EdgeEventInput): NotificationContent {
    const entryPoint = input.entryPointId || '未知区域';

    switch (type) {
      case 'LIFE_SAFETY_ALARM':
        return {
          emoji: '🆘',
          title: '紧急：生命安全警报',
          body: `检测到烟雾/一氧化碳警报，请立即确认安全`,
        };

      case 'SECURITY_TRIGGERED_ALARM':
        return {
          emoji: '🚨',
          title: '入侵警报已触发',
          body: `在 ${entryPoint} 触发入侵警报，请立即查看`,
        };

      case 'SECURITY_PENDING_ALERT':
        const delaySec = input.entryDelaySec || 30;
        return {
          emoji: '⚠️',
          title: '安全警报：等待验证',
          body: `${entryPoint} 门已打开，${delaySec}秒后将触发警报`,
        };

      case 'SECURITY_PRE_ALERT':
        const levelEmoji = input.preLevel === 'L2' ? '⚡' : '👀';
        const levelLabel = input.preLevel === 'L2' ? '可疑活动' : '轻微异常';
        return {
          emoji: levelEmoji,
          title: levelLabel,
          body: `在 ${entryPoint} 检测到${levelLabel}`,
        };

      case 'SECURITY_TAMPER_ALERT':
        return {
          emoji: '🔧',
          title: '设备异常警报',
          body: `检测到设备可能被篡改，请检查`,
        };

      case 'LOGISTICS_DELIVERY':
        return {
          emoji: '📦',
          title: '快递到达',
          body: `在 ${entryPoint} 检测到快递`,
        };

      default:
        return {
          emoji: '🔔',
          title: '安全通知',
          body: '检测到安全事件，请查看',
        };
    }
  }
}
