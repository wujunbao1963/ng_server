import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Step 3: append-only ingest audit log for v7.7+ Edge summary upserts.
 *
 * This table is intentionally denormalized and write-optimized:
 *  - Helps diagnose retries / stale sequence / stale timestamp.
 *  - Supports future dedup / messageId evolution.
 * 
 * v7.7.1: 新增通知决策审计字段
 *  - notificationEligible: Edge 的通知资格决定
 *  - notificationSuppressReason: Edge 的抑制原因
 */
@Entity('ng_edge_ingest_audit')
@Index('idx_ng_edge_ingest_audit_circle_event_received', ['circleId', 'eventId', 'receivedAt'])
@Index('idx_ng_edge_ingest_audit_circle_edge_received', ['circleId', 'edgeInstanceId', 'receivedAt'])
export class NgEdgeIngestAudit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'circle_id' })
  circleId!: string;

  @Column({ type: 'text', name: 'event_id' })
  eventId!: string;

  @Column({ type: 'text', name: 'edge_instance_id' })
  edgeInstanceId!: string;

  @Column({ type: 'bigint', name: 'sequence', default: 0 })
  sequence!: string; // bigint from pg driver

  @Column({ type: 'text', name: 'payload_hash' })
  payloadHash!: string;

  @Column({ type: 'boolean', name: 'applied' })
  applied!: boolean;

  @Column({ type: 'text', name: 'reason' })
  reason!: string;

  @Column({ type: 'text', name: 'schema_version' })
  schemaVersion!: string;

  /**
   * Logical message type for audit clarity.
   * Examples: event_summary_upsert, incident_manifest_upsert
   */
  @Column({ type: 'text', name: 'message_type', default: 'event_summary_upsert' })
  messageType!: string;

  /**
   * v7.7.1: Edge 的通知资格决定
   * - true: Edge 允许通知
   * - false: Edge 抑制通知
   * - null: 老版本 Edge 未发送此字段
   */
  @Column({ type: 'boolean', name: 'notification_eligible', nullable: true })
  notificationEligible!: boolean | null;

  /**
   * v7.7.1: Edge 的通知抑制原因
   * - MODE_HOME: 在 Home 模式下抑制
   * - MODE_DISARM: 在 Disarm 模式下抑制
   * - BELOW_THRESHOLD: 低于通知阈值 (如 PRE-L0)
   */
  @Column({ type: 'text', name: 'notification_suppress_reason', nullable: true })
  notificationSuppressReason!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'received_at' })
  receivedAt!: Date;
}
