import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'ng_users' })
export class NgUser {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  id!: string;

  @Column({ name: 'email', type: 'text', unique: true })
  email!: string;

  @Column({ name: 'display_name', type: 'text', nullable: true })
  displayName!: string | null;

  @Column({ name: 'is_admin', type: 'boolean', default: false })
  isAdmin!: boolean;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;
}
