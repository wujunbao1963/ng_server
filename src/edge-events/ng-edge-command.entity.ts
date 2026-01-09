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

  @Column({ type: 'uuid' })
  @Index()
  circleId!: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  edgeInstanceId!: string;

  @Column({ type: 'varchar', length: 50 })
  commandType!: string;

  @Column({ type: 'jsonb', nullable: true })
  commandPayload!: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  status!: 'pending' | 'delivered' | 'executed' | 'failed' | 'expired';

  @Column({ type: 'uuid', nullable: true })
  triggeredByUserId!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  eventId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  executedAt!: Date | null;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'text', nullable: true })
  resultMessage!: string | null;
}
