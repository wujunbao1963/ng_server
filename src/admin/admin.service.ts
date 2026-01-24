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

// ============================================================================
// Service
// ============================================================================

/**
 * Admin Service - SuperAdmin 系统级管理
 * 
 * SuperAdmin 权限:
 * - 管理 Users (创建/删除/修改)
 * - 设定/解除用户的 Owner 权限 (canCreateCircle)
 * - 查看所有 Circles (只读)
 * - 系统统计
 * 
 * SuperAdmin 不能:
 * - 创建/删除 Circle (Owner 职责)
 * - 管理 Circle 内部角色 (Owner 职责)
 */
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
      id: r.id,
      circleId: r.circleId,
      circleName: circleMap.get(r.circleId)?.name ?? 'Unknown',
      role: r.role,
      validFrom: r.validFrom,
      validUntil: r.validUntil,
      suspended: r.suspended,
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
      canCreateCircle: false, // 默认不能创建 Circle
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
   * 注意：如果用户是 Circle Owner，不能删除
   */
  async deleteUser(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 检查用户是否是任何 Circle 的 Owner
    const ownerRoles = await this.rolesRepo.find({
      where: { userId, role: 'owner' },
    });

    if (ownerRoles.length > 0) {
      const circleIds = ownerRoles.map(r => r.circleId);
      throw new BadRequestException(
        `Cannot delete user who is Owner of ${ownerRoles.length} circle(s). ` +
        `User must delete their circles first or transfer ownership. ` +
        `Circle IDs: ${circleIds.join(', ')}`
      );
    }

    // 删除用户的所有非 Owner 角色
    await this.rolesRepo.delete({ userId });

    // 删除用户
    await this.usersRepo.delete({ id: userId });

    return { deleted: true, userId };
  }

  // ==========================================================================
  // Owner 权限管理
  // ==========================================================================

  /**
   * 授予用户 Owner 权限 (canCreateCircle = true)
   * 
   * POST /api/admin/users/:userId/grant-owner
   */
  async grantOwner(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.canCreateCircle) {
      return { user, changed: false, message: 'User already has owner permission' };
    }

    user.canCreateCircle = true;
    await this.usersRepo.save(user);

    return { user, changed: true, message: 'Owner permission granted' };
  }

  /**
   * 撤销用户 Owner 权限 (canCreateCircle = false)
   * 
   * DELETE /api/admin/users/:userId/grant-owner
   * 
   * 注意：如果用户已有 Circle，不能撤销
   */
  async revokeOwner(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.canCreateCircle) {
      return { user, changed: false, message: 'User does not have owner permission' };
    }

    // 检查用户是否已有 Circle
    const ownerRoles = await this.rolesRepo.find({
      where: { userId, role: 'owner' },
    });

    if (ownerRoles.length > 0) {
      throw new BadRequestException(
        `Cannot revoke owner permission. User owns ${ownerRoles.length} circle(s). ` +
        `User must delete their circles first.`
      );
    }

    user.canCreateCircle = false;
    await this.usersRepo.save(user);

    return { user, changed: true, message: 'Owner permission revoked' };
  }

  // ==========================================================================
  // 圈子查看 (只读)
  // ==========================================================================

  /**
   * 列出所有圈子 (只读)
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
        const ownerRole = await this.rolesRepo.findOne({
          where: { circleId: circle.id, role: 'owner' },
        });
        
        let ownerUser: NgUser | null = null;
        if (ownerRole) {
          ownerUser = await this.usersRepo.findOne({ where: { id: ownerRole.userId } }) ?? null;
        }

        return {
          id: circle.id,
          name: circle.name,
          propertyType: circle.propertyType,
          address: circle.address,
          city: circle.city,
          createdAt: circle.createdAt,
          memberCount,
          owner: ownerRole ? {
            userId: ownerRole.userId,
            email: ownerUser?.email ?? ownerRole.email,
            displayName: ownerUser?.displayName ?? ownerRole.displayName,
          } : null,
        };
      }),
    );

    return { circles: circlesWithStats, total, limit, offset };
  }

  /**
   * 获取圈子详情 (只读)
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

    // 获取成员的用户信息
    const userIds = [...new Set(roles.map(r => r.userId))];
    const users = userIds.length > 0
      ? await this.usersRepo.findByIds(userIds)
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const rolesWithUser = roles.map(r => ({
      id: r.id,
      userId: r.userId,
      email: userMap.get(r.userId)?.email ?? r.email,
      displayName: userMap.get(r.userId)?.displayName ?? r.displayName,
      role: r.role,
      validFrom: r.validFrom,
      validUntil: r.validUntil,
      suspended: r.suspended,
    }));

    return { circle, roles: rolesWithUser };
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
    const ownerCount = await this.usersRepo.count({ where: { canCreateCircle: true } });
    const circleCount = await this.circlesRepo.count();
    const roleCount = await this.rolesRepo.count();

    return {
      users: { 
        total: userCount, 
        admins: adminCount,
        owners: ownerCount,
      },
      circles: { total: circleCount },
      roles: { total: roleCount },
    };
  }
}
