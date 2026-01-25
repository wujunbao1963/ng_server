import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

/**
 * Witness Alert 类型枚举
 */
export enum WitnessAlertType {
  // Witness Task 相关
  TASK_CREATED = 'task_created',           // 任务创建 (通知可用 Witness)
  TASK_CLAIMED = 'task_claimed',           // 任务被领取 (通知 Creator)
  TASK_ARRIVED = 'task_arrived',           // Witness 到达 (通知 Creator)
  TASK_SUBMITTED = 'task_submitted',       // 报告提交 (通知 Creator)
  TASK_CLOSED = 'task_closed',             // 任务关闭 (通知 Witness)
  TASK_CANCELED = 'task_canceled',         // 任务取消 (通知 Witness)
  TASK_EXPIRED = 'task_expired',           // 任务过期 (通知 Creator)
  TASK_ABANDONED = 'task_abandoned',       // 任务放弃 (通知 Creator)
  TASK_RISK_ABORTED = 'task_risk_aborted', // 风险退出 (通知 Creator)
}

/**
 * Witness Alert 优先级
 */
export enum WitnessAlertPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Witness Alert Entity
 * 
 * 专用于 Witness Task 的消息通知
 * 与 NG 系统的 notification 分离
 */
@Entity({ name: 'ng_witness_alerts' })
export class NgWitnessAlert {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  // 接收者
  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  // 通知类型
  @Index()
  @Column({ type: 'varchar', length: 50, name: 'type' })
  type!: WitnessAlertType;

  // 优先级
  @Column({ type: 'varchar', length: 20, default: 'normal' })
  priority!: WitnessAlertPriority;

  // 标题
  @Column({ type: 'varchar', length: 200 })
  title!: string;

  // 内容
  @Column({ type: 'text', nullable: true })
  body!: string | null;

  // 关联实体
  @Index()
  @Column({ type: 'uuid', name: 'circle_id', nullable: true })
  circleId!: string | null;

  @Index()
  @Column({ type: 'uuid', name: 'task_id', nullable: true })
  taskId!: string | null;

  @Column({ type: 'varchar', length: 100, name: 'event_id', nullable: true })
  eventId!: string | null;

  // 发送者信息
  @Column({ type: 'uuid', name: 'actor_user_id', nullable: true })
  actorUserId!: string | null;

  @Column({ type: 'varchar', length: 20, name: 'actor_role', nullable: true })
  actorRole!: string | null;

  // 状态
  @Index()
  @Column({ type: 'boolean', default: false })
  read!: boolean;

  @Column({ type: 'timestamptz', name: 'read_at', nullable: true })
  readAt!: Date | null;

  // 额外数据 (JSON)
  @Column({ type: 'jsonb', nullable: true })
  data!: Record<string, any> | null;

  // 时间戳
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  // 过期时间 (可选，用于自动清理)
  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt!: Date | null;
}
