import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Edge 命令实体
 * 
 * 用于 Server -> Edge 的命令下发通道
 * Edge 通过轮询获取待执行命令
 */
@Entity('ng_edge_commands')
@Index(['circleId', 'edgeInstanceId', 'status'])
export class NgEdgeCommand {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'circle_id' })
  @Index()
  circleId!: string;

  @Column({ type: 'varchar', length: 100, name: 'edge_instance_id' })
  @Index()
  edgeInstanceId!: string;

  @Column({ type: 'varchar', length: 50, name: 'command_type' })
  commandType!: string;

  @Column({ type: 'jsonb', nullable: true, name: 'command_payload' })
  commandPayload!: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  status!: 'pending' | 'delivered' | 'executed' | 'failed' | 'expired';

  @Column({ type: 'uuid', nullable: true, name: 'triggered_by_user_id' })
  triggeredByUserId!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'event_id' })
  eventId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'delivered_at' })
  deliveredAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'executed_at' })
  executedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'text', nullable: true, name: 'result_message' })
  resultMessage!: string | null;
}
