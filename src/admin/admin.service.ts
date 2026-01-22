import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { NgUser } from '../auth/ng-user.entity';
import { NgCircle } from '../circles/ng-circle.entity';
import { NgRole } from '../roles/ng-role.entity';

// ============================================================================
// DTOs
// ============================================================================

export interface CreateUserDto {
  email: string;
  displayName?: string;
  isAdmin?: boolean;
}

export interface UpdateUserDto {
  displayName?: string;
  isAdmin?: boolean;
}

export interface CreateCircleDto {
  name: string;
  ownerUserId: string;
}

export interface UpdateCircleDto {
  name?: string;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(NgUser)
    private readonly usersRepo: Repository<NgUser>,
    @InjectRepository(NgCircle)
    private readonly circlesRepo: Repository<NgCircle>,
    @InjectRepository(NgRole)
    private readonly rolesRepo: Repository<NgRole>,
  ) {}

  // ==========================================================================
  // 用户管理
  // ==========================================================================

  /**
   * 列出所有用户
   */
  async listUsers(opts?: { limit?: number; offset?: number }) {
    const limit = opts?.limit ?? 100;
    const offset = opts?.offset ?? 0;

    const [users, total] = await this.usersRepo.findAndCount({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { users, total, limit, offset };
  }

  /**
   * 获取用户详情（包含所属圈子和角色）
   */
  async getUser(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 获取用户的所有角色
    const roles = await this.rolesRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // 获取关联的圈子信息
    const circleIds = [...new Set(roles.map(r => r.circleId))];
    const circles = circleIds.length > 0
      ? await this.circlesRepo.findByIds(circleIds)
      : [];

    const circleMap = new Map(circles.map(c => [c.id, c]));

    const rolesWithCircle = roles.map(r => ({
      ...r,
      circleName: circleMap.get(r.circleId)?.name ?? 'Unknown',
    }));

    return { user, roles: rolesWithCircle };
  }

  /**
   * 创建用户
   */
  async createUser(dto: CreateUserDto) {
    // 检查邮箱是否已存在
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const user = this.usersRepo.create({
      id: randomUUID(),
      email: dto.email,
      displayName: dto.displayName ?? null,
      isAdmin: dto.isAdmin ?? false,
    });

    await this.usersRepo.save(user);
    return user;
  }

  /**
   * 更新用户
   */
  async updateUser(userId: string, dto: UpdateUserDto) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.displayName !== undefined) {
      user.displayName = dto.displayName;
    }
    if (dto.isAdmin !== undefined) {
      user.isAdmin = dto.isAdmin;
    }

    await this.usersRepo.save(user);
    return user;
  }

  /**
   * 删除用户
   * 注意：会级联删除用户的所有角色
   */
  async deleteUser(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 先删除用户的所有角色
    await this.rolesRepo.delete({ userId });

    // 删除用户
    await this.usersRepo.delete({ id: userId });

    return { deleted: true, userId };
  }

  // ==========================================================================
  // 圈子管理
  // ==========================================================================

  /**
   * 列出所有圈子
   */
  async listCircles(opts?: { limit?: number; offset?: number }) {
    const limit = opts?.limit ?? 100;
    const offset = opts?.offset ?? 0;

    const [circles, total] = await this.circlesRepo.findAndCount({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    // 为每个圈子获取成员数和 owner 信息
    const circlesWithStats = await Promise.all(
      circles.map(async (circle) => {
        const memberCount = await this.rolesRepo.count({ where: { circleId: circle.id } });
        const owner = await this.rolesRepo.findOne({
          where: { circleId: circle.id, role: 'owner' },
        });
        return {
          ...circle,
          memberCount,
          ownerEmail: owner?.email ?? null,
          ownerName: owner?.displayName ?? null,
        };
      }),
    );

    return { circles: circlesWithStats, total, limit, offset };
  }

  /**
   * 获取圈子详情
   */
  async getCircle(circleId: string) {
    const circle = await this.circlesRepo.findOne({ where: { id: circleId } });
    if (!circle) {
      throw new NotFoundException('Circle not found');
    }

    // 获取所有成员
    const roles = await this.rolesRepo.find({
      where: { circleId },
      order: { createdAt: 'ASC' },
    });

    return { circle, roles };
  }

  /**
   * 创建圈子（管理员创建，指定 owner）
   */
  async createCircle(dto: CreateCircleDto) {
    // 验证 owner 用户存在
    const owner = await this.usersRepo.findOne({ where: { id: dto.ownerUserId } });
    if (!owner) {
      throw new BadRequestException('Owner user not found');
    }

    // 创建圈子
    const circle = this.circlesRepo.create({
      id: randomUUID(),
      name: dto.name,
    });
    await this.circlesRepo.save(circle);

    // 创建 owner 角色
    const role = this.rolesRepo.create({
      id: randomUUID(),
      circleId: circle.id,
      userId: owner.id,
      role: 'owner',
      email: owner.email,
      displayName: owner.displayName,
      validFrom: new Date(),
      validUntil: null, // owner 永久有效
      suspended: false,
      syncVersion: 1,
    });
    await this.rolesRepo.save(role);

    return { circle, ownerRole: role };
  }

  /**
   * 更新圈子
   */
  async updateCircle(circleId: string, dto: UpdateCircleDto) {
    const circle = await this.circlesRepo.findOne({ where: { id: circleId } });
    if (!circle) {
      throw new NotFoundException('Circle not found');
    }

    if (dto.name !== undefined) {
      circle.name = dto.name;
    }

    await this.circlesRepo.save(circle);
    return circle;
  }

  /**
   * 删除圈子
   * 注意：会级联删除圈子的所有角色
   */
  async deleteCircle(circleId: string) {
    const circle = await this.circlesRepo.findOne({ where: { id: circleId } });
    if (!circle) {
      throw new NotFoundException('Circle not found');
    }

    // 先删除圈子的所有角色
    await this.rolesRepo.delete({ circleId });

    // 删除圈子
    await this.circlesRepo.delete({ id: circleId });

    return { deleted: true, circleId };
  }

  // ==========================================================================
  // 统计
  // ==========================================================================

  /**
   * 获取系统统计信息
   */
  async getStats() {
    const userCount = await this.usersRepo.count();
    const adminCount = await this.usersRepo.count({ where: { isAdmin: true } });
    const circleCount = await this.circlesRepo.count();
    const roleCount = await this.rolesRepo.count();

    return {
      users: { total: userCount, admins: adminCount },
      circles: { total: circleCount },
      roles: { total: roleCount },
    };
  }
}
