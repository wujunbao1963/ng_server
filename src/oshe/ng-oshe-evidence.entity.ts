import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

/**
 * On-Scene Human Evidence (OSHE) Entity
 * 
 * 实现: ng_l2_on_scene_human_evidence_min_spec.md
 * 
 * OSHE 是人工补充证据，不影响安全状态机。
 * 存储在 Server 端，与系统证据分离。
 */
@Entity({ name: 'ng_oshe_evidence' })
export class NgOsheEvidence {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'circle_id' })
  circleId!: string;

  @Index()
  @Column({ type: 'uuid', name: 'event_id' })
  eventId!: string;

  // 证据分类 (固定为 ON_SCENE_HUMAN)
  @Column({ type: 'varchar', length: 20, name: 'evidence_class', default: 'ON_SCENE_HUMAN' })
  evidenceClass!: string;

  // 媒体类型
  @Column({ type: 'varchar', length: 20, name: 'media_type' })
  mediaType!: 'video' | 'image' | 'audio';

  // 捕获信息
  @Column({ type: 'timestamptz', name: 'captured_at' })
  capturedAt!: Date;

  @Index()
  @Column({ type: 'uuid', name: 'captured_by_user_id' })
  capturedByUserId!: string;

  @Column({ type: 'varchar', length: 20, name: 'captured_by_role' })
  capturedByRole!: string;

  @Column({ type: 'varchar', length: 20, name: 'after_threat_state' })
  afterThreatState!: 'TRIGGERED' | 'RESOLVED';

  @Column({ type: 'varchar', length: 30, default: 'human_on_scene' })
  source!: string;

  // 现场验证
  @Column({ type: 'boolean', name: 'presence_verified', default: false })
  presenceVerified!: boolean;

  @Column({ type: 'double precision', name: 'presence_latitude', nullable: true })
  presenceLatitude!: number | null;

  @Column({ type: 'double precision', name: 'presence_longitude', nullable: true })
  presenceLongitude!: number | null;

  @Column({ type: 'double precision', name: 'presence_accuracy_m', nullable: true })
  presenceAccuracyM!: number | null;

  @Column({ type: 'boolean', name: 'presence_verification_degraded', default: false })
  presenceVerificationDegraded!: boolean;

  // 文件信息
  @Column({ type: 'varchar', length: 500, name: 'file_url' })
  fileUrl!: string;

  @Column({ type: 'varchar', length: 255, name: 'file_name', nullable: true })
  fileName!: string | null;

  @Column({ type: 'bigint', name: 'file_size_bytes', nullable: true })
  fileSizeBytes!: number | null;

  @Column({ type: 'varchar', length: 64, name: 'file_hash_sha256', nullable: true })
  fileHashSha256!: string | null;

  // 时间戳完整性
  @CreateDateColumn({ type: 'timestamptz', name: 'server_received_at' })
  serverReceivedAt!: Date;

  @Column({ type: 'boolean', name: 'timestamp_discrepancy', default: false })
  timestampDiscrepancy!: boolean;

  // 备注
  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  // 关联 Witness Task
  @Index()
  @Column({ type: 'uuid', name: 'witness_task_id', nullable: true })
  witnessTaskId!: string | null;

  // 元数据
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;
}
