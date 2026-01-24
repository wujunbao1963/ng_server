import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

/**
 * Witness Task Entity
 * 
 * 实现: NG_PRODUCT_SPEC_L2_v8 §4.3 Witness Assistance Flow
 * 
 * 状态流转:
 * CREATED → OFFERED → CLAIMED → ARRIVED → SUBMITTED → CLOSED
 *                 ↘         ↘         ↘
 *               EXPIRED  ABANDONED  CANCELED
 */
@Entity({ name: 'ng_witness_tasks' })
export class NgWitnessTask {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'circle_id' })
  circleId!: string;

  @Index()
  @Column({ type: 'uuid', name: 'event_id', nullable: true })
  eventId!: string | null;

  // Task 信息
  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // 状态
  @Index()
  @Column({ type: 'varchar', length: 20, default: 'created' })
  status!: 'created' | 'offered' | 'claimed' | 'arrived' | 'submitted' | 'closed' | 'canceled' | 'expired' | 'abandoned';

  // 参与者
  @Column({ type: 'uuid', name: 'creator_user_id' })
  creatorUserId!: string;

  @Column({ type: 'varchar', length: 20, name: 'creator_role' })
  creatorRole!: 'owner' | 'caretaker';

  @Index()
  @Column({ type: 'uuid', name: 'witness_user_id', nullable: true })
  witnessUserId!: string | null;

  // 时间戳
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'offered_at', nullable: true })
  offeredAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'claimed_at', nullable: true })
  claimedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'arrived_at', nullable: true })
  arrivedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'submitted_at', nullable: true })
  submittedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'closed_at', nullable: true })
  closedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'canceled_at', nullable: true })
  canceledAt!: Date | null;

  @Index()
  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt!: Date | null;

  // TTL 配置
  @Column({ type: 'int', name: 'claim_ttl_sec', default: 600 })
  claimTtlSec!: number;

  @Column({ type: 'int', name: 'arrive_ttl_sec', default: 1200 })
  arriveTtlSec!: number;

  @Column({ type: 'int', name: 'submit_ttl_sec', default: 600 })
  submitTtlSec!: number;

  // Proximity 验证
  @Column({ type: 'int', name: 'proximity_radius_m', default: 50 })
  proximityRadiusM!: number;

  @Column({ type: 'double precision', name: 'arrival_latitude', nullable: true })
  arrivalLatitude!: number | null;

  @Column({ type: 'double precision', name: 'arrival_longitude', nullable: true })
  arrivalLongitude!: number | null;

  @Column({ type: 'double precision', name: 'arrival_accuracy_m', nullable: true })
  arrivalAccuracyM!: number | null;

  @Column({ type: 'boolean', name: 'proximity_verified', default: false })
  proximityVerified!: boolean;

  @Column({ type: 'varchar', length: 100, name: 'proximity_failure_reason', nullable: true })
  proximityFailureReason!: string | null;

  // 提交内容
  @Column({ type: 'text', name: 'submission_notes', nullable: true })
  submissionNotes!: string | null;

  @Column({ type: 'jsonb', name: 'submission_photos', nullable: true })
  submissionPhotos!: Array<{ url: string; uploadedAt: string }> | null;

  // 取消信息
  @Column({ type: 'uuid', name: 'canceled_by_user_id', nullable: true })
  canceledByUserId!: string | null;

  @Column({ type: 'varchar', length: 200, name: 'cancel_reason', nullable: true })
  cancelReason!: string | null;

  // 元数据
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;
}
