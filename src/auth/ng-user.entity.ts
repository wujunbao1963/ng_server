import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * User Entity
 * 
 * 用户由 SuperAdmin 管理，或通过注册码自助注册
 */
@Entity({ name: 'ng_users' })
export class NgUser {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  id!: string;

  @Column({ name: 'email', type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 200, nullable: true })
  displayName!: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  /**
   * SuperAdmin 标志
   * - true: 可访问 /api/admin/* 端点
   * - false: 普通用户
   */
  @Column({ name: 'is_admin', type: 'boolean', default: false })
  isAdmin!: boolean;

  /**
   * Owner 权限标志
   * - true: 可创建 Circle
   * - false: 不能创建 Circle
   * 
   * 由 SuperAdmin 通过 /api/admin/users/:id/grant-owner 设定
   */
  @Column({ name: 'can_create_circle', type: 'boolean', default: false })
  canCreateCircle!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
