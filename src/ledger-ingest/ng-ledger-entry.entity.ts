import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

/**
 * NgLedgerEntry - Edge Ledger entries synced to Server
 * 
 * Implements: NG_INTERFACE_CONTRACT_MASTER_v8 §B.3
 * 
 * This is a write-once audit log. Entries are never modified after creation.
 */
@Entity({ name: 'ng_ledger_entries' })
@Index(['edgeInstanceId', 'ledgerSeq'], { unique: true })
export class NgLedgerEntry {
  /**
   * Primary key: composite of edgeInstanceId + ledgerSeq
   * Format: {edgeInstanceId}:{ledgerSeq}
   */
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Index()
  @Column({ type: 'text', name: 'edge_instance_id' })
  edgeInstanceId!: string;

  @Index()
  @Column({ type: 'uuid', name: 'circle_id' })
  circleId!: string;

  @Column({ type: 'bigint', name: 'ledger_seq' })
  ledgerSeq!: number;

  @Index()
  @Column({ type: 'text', name: 'entry_type' })
  entryType!: string;

  @Index()
  @Column({ type: 'text', name: 'event_id', nullable: true })
  eventId!: string | null;

  // Actor info
  @Column({ type: 'text', name: 'actor_id', nullable: true })
  actorId!: string | null;

  @Column({ type: 'text', name: 'actor_role', nullable: true })
  actorRole!: string | null;

  // Timing (Constitution §5.5)
  @Column({ type: 'timestamptz', name: 'device_time' })
  deviceTime!: Date;

  @Column({ type: 'bigint', name: 'mono_time', nullable: true })
  monoTime!: number | null;

  @Column({ type: 'text', name: 'time_quality', default: 'SYNCED' })
  timeQuality!: string;  // SYNCED|UNSYNCED|DRIFT_SUSPECT

  // Payload
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  payload!: Record<string, any>;

  // Contract versions
  @Column({ type: 'text', name: 'contract_version', default: 'ng.edge.server/8.0' })
  contractVersion!: string;

  @Column({ type: 'text', name: 'edge_spec_version', default: 'v7.7' })
  edgeSpecVersion!: string;

  // Idempotency
  @Index({ unique: true })
  @Column({ type: 'text', name: 'idempotency_key' })
  idempotencyKey!: string;

  // Server metadata
  @CreateDateColumn({ type: 'timestamptz', name: 'received_at' })
  receivedAt!: Date;
}
