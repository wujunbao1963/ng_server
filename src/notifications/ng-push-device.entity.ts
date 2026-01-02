import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('ng_push_devices')
@Index('idx_ng_push_devices_user', ['userId'])
export class NgPushDevice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'text' })
  platform!: string; // 'ios' | 'android' | 'web'

  @Column({ type: 'text' })
  token!: string;

  @Column({ type: 'text', name: 'device_id', nullable: true })
  deviceId!: string | null;

  @Column({ type: 'text', name: 'app_version', nullable: true })
  appVersion!: string | null;

  @Column({ type: 'text', nullable: true })
  locale!: string | null;

  @Column({ type: 'text', nullable: true })
  timezone!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
