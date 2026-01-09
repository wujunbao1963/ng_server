import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Edge 命令实体
 * 
 * 用于 Server → Edge 的命令下发通道
 * Edge 通过轮询获取待执行命令
 */
@Entity('ng_edge_commands')
@Index(['circleId', 'edgeInstanceId', 'status'])
export class NgEdgeCommand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  circleId: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  edgeInstanceId: string;

  /**
   * 命令类型
   * - resolve: 解除 TRIGGERED 状态
   * - cancel: 取消 PRE/PENDING 状态
   * - disarm: 撤防
   * - set_mode: 设置模式
   */
  @Column({ type: 'varchar', length: 50 })
  commandType: string;

  /**
   * 命令参数 (JSON)
   * 例如: { eventId: 'inc_xxx', entryPointId: 'ep_back' }
   */
  @Column({ type: 'jsonb', nullable: true })
  commandPayload: Record<string, unknown> | null;

  /**
   * 命令状态
   * - pending: 待执行
   * - delivered: Edge 已收到
   * - executed: Edge 已执行
   * - failed: 执行失败
   * - expired: 已过期
   */
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  status: 'pending' | 'delivered' | 'executed' | 'failed' | 'expired';

  /**
   * 触发用户 ID (App 用户)
   */
  @Column({ type: 'uuid', nullable: true })
  triggeredByUserId: string | null;

  /**
   * 关联事件 ID
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  eventId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  /**
   * Edge 确认收到时间
   */
  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  /**
   * Edge 执行完成时间
   */
  @Column({ type: 'timestamptz', nullable: true })
  executedAt: Date | null;

  /**
   * 命令过期时间 (默认 5 分钟后过期)
   */
  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  /**
   * 执行结果/错误信息
   */
  @Column({ type: 'text', nullable: true })
  resultMessage: string | null;
}
