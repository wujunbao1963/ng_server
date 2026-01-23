import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Circle Entity
 * 
 * Circle 由 Owner 创建和管理
 * SuperAdmin 只能查看和设定/解除 Owner
 */
@Entity({ name: 'ng_circles' })
export class NgCircle {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  id!: string;

  @Column({ name: 'name', type: 'varchar', length: 200 })
  name!: string;

  // =========================================================================
  // 房屋信息
  // =========================================================================

  /**
   * 房屋类型: detached_house | townhouse | apartment | condo | other
   */
  @Column({ name: 'property_type', type: 'varchar', length: 50, nullable: true })
  propertyType!: string | null;

  /**
   * 完整地址
   */
  @Column({ name: 'address', type: 'varchar', length: 500, nullable: true })
  address!: string | null;

  /**
   * 城市
   */
  @Column({ name: 'city', type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  /**
   * 州/省
   */
  @Column({ name: 'state', type: 'varchar', length: 100, nullable: true })
  state!: string | null;

  /**
   * 邮编
   */
  @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: true })
  postalCode!: string | null;

  /**
   * 国家
   */
  @Column({ name: 'country', type: 'varchar', length: 100, nullable: true })
  country!: string | null;

  // =========================================================================
  // GPS 坐标 (用于 Witness 验证)
  // =========================================================================

  @Column({ name: 'latitude', type: 'double precision', nullable: true })
  latitude!: number | null;

  @Column({ name: 'longitude', type: 'double precision', nullable: true })
  longitude!: number | null;

  /**
   * Witness 验证半径 (米), 默认 50m
   */
  @Column({ name: 'proximity_radius_m', type: 'int', default: 50 })
  proximityRadiusM!: number;

  // =========================================================================
  // 其他
  // =========================================================================

  /**
   * 圈子设置 (JSON)
   */
  @Column({ name: 'settings', type: 'jsonb', default: {} })
  settings!: Record<string, any>;

  // =========================================================================
  // 时间戳
  // =========================================================================

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
