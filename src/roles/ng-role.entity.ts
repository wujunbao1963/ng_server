import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * NgRole - Role assignments for Edge users
 * 
 * Implements: NG_SYSTEM_CONSTITUTION_v8 §3 (Role Model)
 * 
 * Roles are synced from Server to Edge for offline validation.
 */
@Entity({ name: 'ng_roles' })
@Index(['circleId', 'userId'], { unique: true })
export class NgRole {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'circle_id' })
  circleId!: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  /**
   * Role type: owner | caretaker | acting_owner | witness
   */
  @Column({ type: 'text' })
  role!: string;

  // User identity
  @Column({ type: 'text', nullable: true })
  email!: string | null;

  @Column({ type: 'text', name: 'display_name', nullable: true })
  displayName!: string | null;

  // Validity window (Constitution §3.6)
  @Column({ type: 'timestamptz', name: 'valid_from' })
  validFrom!: Date;

  @Column({ type: 'timestamptz', name: 'valid_until', nullable: true })
  validUntil!: Date | null;

  @Column({ type: 'boolean', default: false })
  suspended!: boolean;

  // PIN hash (bcrypt)
  @Column({ type: 'text', name: 'pin_hash', nullable: true })
  pinHash!: string | null;

  // Custom permissions (JSON array)
  @Column({ type: 'jsonb', nullable: true })
  permissions!: string[] | null;

  // Sync tracking
  @Column({ type: 'int', name: 'sync_version', default: 1 })
  syncVersion!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

/**
 * Role change audit log
 */
@Entity({ name: 'ng_role_audit' })
export class NgRoleAudit {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'circle_id' })
  circleId!: string;

  @Index()
  @Column({ type: 'uuid', name: 'role_id' })
  roleId!: string;

  @Column({ type: 'uuid', name: 'target_user_id' })
  targetUserId!: string;

  @Column({ type: 'uuid', name: 'actor_user_id' })
  actorUserId!: string;

  /**
   * Action: create | update | suspend | unsuspend | revoke
   */
  @Column({ type: 'text' })
  action!: string;

  @Column({ type: 'jsonb', name: 'old_values', nullable: true })
  oldValues!: Record<string, any> | null;

  @Column({ type: 'jsonb', name: 'new_values', nullable: true })
  newValues!: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
