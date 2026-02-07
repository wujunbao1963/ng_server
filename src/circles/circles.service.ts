import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { In, Repository } from 'typeorm';
import { NgCircle } from './ng-circle.entity';
import { NgUser } from '../auth/ng-user.entity';
import { NgRole } from '../roles/ng-role.entity';
import { NgHttpError, NgErrorCodes } from '../common/errors/ng-http-error';

// ============================================================================
// DTOs
// ============================================================================

export interface CreateCircleDto {
  name: string;
  propertyType?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  proximityRadiusM?: number;
}

export interface UpdateCircleDto {
  name?: string;
  propertyType?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  proximityRadiusM?: number;
}

export interface AddMemberDto {
  email: string;
  role: 'caretaker' | 'acting_owner' | 'witness';
  validUntil?: string; // ISO date string
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class CirclesService {
  constructor(
    @InjectRepository(NgCircle) private readonly circlesRepo: Repository<NgCircle>,
    @InjectRepository(NgRole) private readonly rolesRepo: Repository<NgRole>,
    @InjectRepository(NgUser) private readonly usersRepo: Repository<NgUser>,
  ) {}

  // ==========================================================================
  // Circle CRUD
  // ==========================================================================

  /**
   * 创建 Circle
   * 
   * POST /api/circles
   * 
   * 要求: 用户必须有 canCreateCircle 权限 (由 SuperAdmin 授予)
   */
  async createCircle(ownerUserId: string, dto: CreateCircleDto) {
    const user = await this.usersRepo.findOne({ where: { id: ownerUserId } });
    if (!user) {
      throw new NgHttpError({
        statusCode: 401,
        error: 'Unauthorized',
        code: NgErrorCodes.UNAUTHORIZED,
        message: 'User not found',
        timestamp: new Date().toISOString(),
        retryable: false,
      });
    }

    // 检查 canCreateCircle 权限
    if (!user.canCreateCircle) {
      throw new NgHttpError({
        statusCode: 403,
        error: 'Forbidden',
        code: NgErrorCodes.FORBIDDEN,
        message: 'You do not have permission to create circles. Contact admin to grant owner permission.',
        timestamp: new Date().toISOString(),
        retryable: false,
      });
    }

    // 创建 Circle
    const circleId = crypto.randomUUID();
    const circle = this.circlesRepo.create({
      id: circleId,
      name: dto.name,
      propertyType: dto.propertyType ?? null,
      address: dto.address ?? null,
      city: dto.city ?? null,
      state: dto.state ?? null,
      postalCode: dto.postalCode ?? null,
      country: dto.country ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      proximityRadiusM: dto.proximityRadiusM ?? 50,
    });
    await this.circlesRepo.save(circle);

    // 创建 Owner 角色
    const role = this.rolesRepo.create({
      id: crypto.randomUUID(),
      circleId,
      userId: ownerUserId,
      role: 'owner',
      email: user.email,
      displayName: user.displayName,
      validFrom: new Date(),
      validUntil: null, // owner 永久有效
      suspended: false,
      syncVersion: 1,
    });
    await this.rolesRepo.save(role);

    return {
      circle: this.formatCircle(circle),
      role: this.formatRole(role),
    };
  }

  /**
   * 列出用户的所有 Circles
   * 
   * GET /api/circles
   */
  async listMyCircles(userId: string) {
    const roles = await this.rolesRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const circleIds = roles.map(r => r.circleId);
    if (circleIds.length === 0) {
      return { circles: [], count: 0 };
    }

    const circles = await this.circlesRepo.find({ where: { id: In(circleIds) } });
    const byId = new Map(circles.map(c => [c.id, c]));

    return {
      circles: roles.map(r => {
        const circle = byId.get(r.circleId);
        return {
          id: r.circleId,
          name: circle?.name ?? 'Unknown',
          role: r.role,
          validFrom: r.validFrom.toISOString(),
          validUntil: r.validUntil?.toISOString() ?? null,
          suspended: r.suspended,
          createdAt: circle?.createdAt.toISOString() ?? null,
        };
      }),
      count: roles.length,
    };
  }

  /**
   * 获取 Circle 详情
   * 
   * GET /api/circles/:circleId
   */
  async getCircleDetail(requesterUserId: string, circleId: string) {
    const membership = await this.mustBeMember(requesterUserId, circleId);

    const circle = await this.circlesRepo.findOne({ where: { id: circleId } });
    if (!circle) {
      throw new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: NgErrorCodes.NOT_FOUND,
        message: 'Circle not found',
        timestamp: new Date().toISOString(),
        retryable: false,
      });
    }

    // 获取所有成员角色
    const roles = await this.rolesRepo.find({
      where: { circleId },
      order: { createdAt: 'ASC' },
    });

    // 找 owner
    const ownerRole = roles.find(r => r.role === 'owner');

    return {
      circle: this.formatCircle(circle),
      myRole: membership.role,
      owner: ownerRole ? {
        userId: ownerRole.userId,
        email: ownerRole.email,
        displayName: ownerRole.displayName,
      } : null,
      members: roles.map(r => this.formatRole(r)),
      memberCount: roles.length,
    };
  }

  /**
   * 更新 Circle (仅 Owner)
   * 
   * PUT /api/circles/:circleId
   */
  async updateCircle(requesterUserId: string, circleId: string, dto: UpdateCircleDto) {
    await this.mustHaveRole(requesterUserId, circleId, ['owner']);

    const circle = await this.circlesRepo.findOne({ where: { id: circleId } });
    if (!circle) {
      throw new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: NgErrorCodes.NOT_FOUND,
        message: 'Circle not found',
        timestamp: new Date().toISOString(),
        retryable: false,
      });
    }

    // 更新字段
    if (dto.name !== undefined) circle.name = dto.name;
    if (dto.propertyType !== undefined) circle.propertyType = dto.propertyType;
    if (dto.address !== undefined) circle.address = dto.address;
    if (dto.city !== undefined) circle.city = dto.city;
    if (dto.state !== undefined) circle.state = dto.state;
    if (dto.postalCode !== undefined) circle.postalCode = dto.postalCode;
    if (dto.country !== undefined) circle.country = dto.country;
    if (dto.latitude !== undefined) circle.latitude = dto.latitude;
    if (dto.longitude !== undefined) circle.longitude = dto.longitude;
    if (dto.proximityRadiusM !== undefined) circle.proximityRadiusM = dto.proximityRadiusM;

    await this.circlesRepo.save(circle);

    return { circle: this.formatCircle(circle) };
  }

  /**
   * 删除 Circle (仅 Owner)
   * 
   * DELETE /api/circles/:circleId
   */
  async deleteCircle(requesterUserId: string, circleId: string) {
    await this.mustHaveRole(requesterUserId, circleId, ['owner']);

    const circle = await this.circlesRepo.findOne({ where: { id: circleId } });
    if (!circle) {
      throw new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: NgErrorCodes.NOT_FOUND,
        message: 'Circle not found',
        timestamp: new Date().toISOString(),
        retryable: false,
      });
    }

    // 删除所有角色
    await this.rolesRepo.delete({ circleId });

    // 删除 Circle
    await this.circlesRepo.delete({ id: circleId });

    return { deleted: true, circleId };
  }

  // ==========================================================================
  // Member Management
  // ==========================================================================

  /**
   * 列出 Circle 成员
   * 
   * GET /api/circles/:circleId/members
   */
  async listMembers(requesterUserId: string, circleId: string) {
    await this.mustBeMember(requesterUserId, circleId);

    const roles = await this.rolesRepo.find({
      where: { circleId },
      order: { createdAt: 'ASC' },
    });

    return {
      members: roles.map(r => this.formatRole(r)),
      count: roles.length,
    };
  }

  /**
   * 添加成员 (Owner only)
   * 
   * POST /api/circles/:circleId/members
   * { email, role, validUntil? }
   */
  async addMember(requesterUserId: string, circleId: string, dto: AddMemberDto) {
    await this.mustHaveRole(requesterUserId, circleId, ['owner']);

    // 查找用户
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: NgErrorCodes.NOT_FOUND,
        message: 'User not found. They must register first.',
        timestamp: new Date().toISOString(),
        retryable: false,
        details: { email: dto.email },
      });
    }

    // 检查是否已是成员
    const existing = await this.rolesRepo.findOne({
      where: { circleId, userId: user.id },
    });
    if (existing) {
      return {
        created: false,
        role: this.formatRole(existing),
        message: 'User is already a member',
      };
    }

    // 验证角色
    const validRoles = ['caretaker', 'acting_owner', 'witness'];
    if (!validRoles.includes(dto.role)) {
      throw new NgHttpError({
        statusCode: 400,
        error: 'Bad Request',
        code: NgErrorCodes.VALIDATION_ERROR,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        timestamp: new Date().toISOString(),
        retryable: false,
      });
    }

    // 创建角色
    const role = this.rolesRepo.create({
      id: crypto.randomUUID(),
      circleId,
      userId: user.id,
      role: dto.role,
      email: user.email,
      displayName: user.displayName,
      validFrom: new Date(),
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      suspended: false,
      syncVersion: 1,
    });
    await this.rolesRepo.save(role);

    return {
      created: true,
      role: this.formatRole(role),
    };
  }

  /**
   * 移除成员 (Owner only)
   * 
   * DELETE /api/circles/:circleId/members/:userId
   */
  async removeMember(requesterUserId: string, circleId: string, targetUserId: string) {
    await this.mustHaveRole(requesterUserId, circleId, ['owner']);

    // 不能移除自己 (owner)
    if (targetUserId === requesterUserId) {
      throw new NgHttpError({
        statusCode: 400,
        error: 'Bad Request',
        code: NgErrorCodes.VALIDATION_ERROR,
        message: 'Cannot remove yourself. Transfer ownership first or delete the circle.',
        timestamp: new Date().toISOString(),
        retryable: false,
      });
    }

    const role = await this.rolesRepo.findOne({
      where: { circleId, userId: targetUserId },
    });
    if (!role) {
      throw new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: NgErrorCodes.NOT_FOUND,
        message: 'Member not found',
        timestamp: new Date().toISOString(),
        retryable: false,
      });
    }

    await this.rolesRepo.delete({ id: role.id });

    return { removed: true, userId: targetUserId };
  }

  /**
   * 退出 Circle (非 Owner)
   * 
   * POST /api/circles/:circleId/leave
   */
  async leaveCircle(requesterUserId: string, circleId: string) {
    const membership = await this.mustBeMember(requesterUserId, circleId);

    if (membership.role === 'owner') {
      throw new NgHttpError({
        statusCode: 400,
        error: 'Bad Request',
        code: NgErrorCodes.VALIDATION_ERROR,
        message: 'Owner cannot leave circle. Transfer ownership first or delete the circle.',
        timestamp: new Date().toISOString(),
        retryable: false,
      });
    }

    await this.rolesRepo.delete({ id: membership.id });

    return { left: true, circleId };
  }

  /**
   * 转让 Owner (Owner only)
   * 
   * POST /api/circles/:circleId/transfer-ownership
   * { newOwnerUserId }
   */
  async transferOwnership(requesterUserId: string, circleId: string, newOwnerUserId: string) {
    await this.mustHaveRole(requesterUserId, circleId, ['owner']);

    if (newOwnerUserId === requesterUserId) {
      throw new NgHttpError({
        statusCode: 400,
        error: 'Bad Request',
        code: NgErrorCodes.VALIDATION_ERROR,
        message: 'Cannot transfer ownership to yourself',
        timestamp: new Date().toISOString(),
        retryable: false,
      });
    }

    // 检查新 owner 是否为成员
    const newOwnerRole = await this.rolesRepo.findOne({
      where: { circleId, userId: newOwnerUserId },
    });
    if (!newOwnerRole) {
      throw new NgHttpError({
        statusCode: 400,
        error: 'Bad Request',
        code: NgErrorCodes.VALIDATION_ERROR,
        message: 'New owner must be a member of the circle',
        timestamp: new Date().toISOString(),
        retryable: false,
      });
    }

    // 当前 owner 变为 caretaker
    const currentOwnerRole = await this.rolesRepo.findOne({
      where: { circleId, userId: requesterUserId },
    });
    if (currentOwnerRole) {
      currentOwnerRole.role = 'caretaker';
      currentOwnerRole.syncVersion += 1;
      await this.rolesRepo.save(currentOwnerRole);
    }

    // 新 owner 变为 owner
    newOwnerRole.role = 'owner';
    newOwnerRole.validUntil = null; // owner 永久有效
    newOwnerRole.syncVersion += 1;
    await this.rolesRepo.save(newOwnerRole);

    return {
      transferred: true,
      circleId,
      previousOwner: requesterUserId,
      newOwner: newOwnerUserId,
    };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * 获取 Circle 的 Owner userId
   */
  async getCircleOwner(circleId: string): Promise<string | null> {
    const owner = await this.rolesRepo.findOne({
      where: { circleId, role: 'owner' },
    });
    return owner?.userId ?? null;
  }

  /**
   * 获取 Circle 中所有 Witness / Acting Owner 的 userId
   */
  async getWitnessUserIds(circleId: string): Promise<string[]> {
    const roles = await this.rolesRepo.find({
      where: { circleId, role: In(['owner', 'caretaker', 'witness', 'acting_owner']), suspended: false },
    });
    return roles.map(r => r.userId);
  }

  async mustBeMember(userId: string, circleId: string): Promise<NgRole> {
    const role = await this.rolesRepo.findOne({ where: { userId, circleId } });
    if (!role) {
      throw new NgHttpError({
        statusCode: 403,
        error: 'Forbidden',
        code: NgErrorCodes.FORBIDDEN,
        message: 'Not a circle member',
        timestamp: new Date().toISOString(),
        retryable: false,
      });
    }
    return role;
  }

  async mustHaveRole(userId: string, circleId: string, allowed: string[]): Promise<NgRole> {
    const role = await this.mustBeMember(userId, circleId);
    if (!allowed.includes(role.role)) {
      throw new NgHttpError({
        statusCode: 403,
        error: 'Forbidden',
        code: NgErrorCodes.FORBIDDEN,
        message: 'Insufficient role for this action',
        timestamp: new Date().toISOString(),
        retryable: false,
        details: { role: role.role, allowed },
      });
    }
    return role;
  }

  private formatCircle(circle: NgCircle) {
    return {
      id: circle.id,
      name: circle.name,
      propertyType: circle.propertyType,
      address: circle.address,
      city: circle.city,
      state: circle.state,
      postalCode: circle.postalCode,
      country: circle.country,
      latitude: circle.latitude,
      longitude: circle.longitude,
      proximityRadiusM: circle.proximityRadiusM,
      createdAt: circle.createdAt.toISOString(),
      updatedAt: circle.updatedAt.toISOString(),
    };
  }

  private formatRole(role: NgRole) {
    return {
      id: role.id,
      userId: role.userId,
      email: role.email,
      displayName: role.displayName,
      role: role.role,
      validFrom: role.validFrom.toISOString(),
      validUntil: role.validUntil?.toISOString() ?? null,
      suspended: role.suspended,
      createdAt: role.createdAt.toISOString(),
    };
  }
}
