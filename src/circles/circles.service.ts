import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { In, Repository } from 'typeorm';
import { NgCircle } from './ng-circle.entity';
import { NgCircleMember } from './ng-circle-member.entity';
import { NgUser } from '../auth/ng-user.entity';
import { NgHttpError, NgErrorCodes } from '../common/errors/ng-http-error';

@Injectable()
export class CirclesService {
  constructor(
    @InjectRepository(NgCircle) private readonly circlesRepo: Repository<NgCircle>,
    @InjectRepository(NgCircleMember) private readonly membersRepo: Repository<NgCircleMember>,
    @InjectRepository(NgUser) private readonly usersRepo: Repository<NgUser>,
  ) {}

  // ==========================================================================
  // 现有方法（保持不变）
  // ==========================================================================

  async createCircle(ownerUserId: string, name: string) {
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

    const circleId = crypto.randomUUID();
    const circle = this.circlesRepo.create({ id: circleId, name });
    await this.circlesRepo.save(circle);

    const member = this.membersRepo.create({
      circleId,
      userId: ownerUserId,
      role: 'owner',
    });
    await this.membersRepo.save(member);

    return { circleId, name, createdAt: circle.createdAt.toISOString() };
  }

  async listMyCircles(userId: string) {
    const memberships = await this.membersRepo.find({ where: { userId } });
    const circleIds = memberships.map((m) => m.circleId);
    if (circleIds.length === 0) {
      return { circles: [] as Array<{ id: string; name: string; role: string }>, count: 0 };
    }
    const circles = await this.circlesRepo.find({ where: { id: In(circleIds) } });
    const byId = new Map(circles.map((c) => [c.id, c]));
    const roleMap = new Map(memberships.map((m) => [m.circleId, m.role]));
    const ordered = circleIds.map((id) => byId.get(id)).filter(Boolean) as NgCircle[];
    return {
      circles: ordered.map((c) => ({
        id: c.id,
        name: c.name,
        role: roleMap.get(c.id) ?? 'unknown',
        createdAt: c.createdAt.toISOString(),
      })),
      count: ordered.length,
    };
  }

  async listMembers(requesterUserId: string, circleId: string) {
    await this.mustBeMember(requesterUserId, circleId);

    const members = await this.membersRepo.find({ where: { circleId } });
    const userIds = members.map((m) => m.userId);
    const users = userIds.length ? await this.usersRepo.find({ where: { id: In(userIds) } }) : [];
    const byId = new Map(users.map((u) => [u.id, u]));

    return {
      members: members.map((m) => ({
        userId: m.userId,
        email: byId.get(m.userId)?.email ?? null,
        displayName: byId.get(m.userId)?.displayName ?? null,
        role: m.role,
        joinedAt: m.createdAt.toISOString(),
      })),
      count: members.length,
    };
  }

  async addMember(
    requesterUserId: string,
    circleId: string,
    dto: { email: string; role: string; clientRequestId?: string },
  ) {
    await this.mustHaveRole(requesterUserId, circleId, ['owner', 'household']);

    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: NgErrorCodes.NOT_FOUND,
        message: 'User not found',
        timestamp: new Date().toISOString(),
        retryable: false,
        details: { email: dto.email },
      });
    }

    const existing = await this.membersRepo.findOne({ where: { circleId, userId: user.id } });
    if (existing) {
      return { created: false, member: { userId: existing.userId, role: existing.role } };
    }

    const member = this.membersRepo.create({
      circleId,
      userId: user.id,
      role: dto.role,
    });
    await this.membersRepo.save(member);
    return { created: true, member: { userId: member.userId, role: member.role } };
  }

  async mustBeMember(userId: string, circleId: string) {
    const m = await this.membersRepo.findOne({ where: { userId, circleId } });
    if (!m) {
      throw new NgHttpError({
        statusCode: 403,
        error: 'Forbidden',
        code: NgErrorCodes.FORBIDDEN,
        message: 'Not a circle member',
        timestamp: new Date().toISOString(),
        retryable: false,
      });
    }
    return m;
  }

  async mustHaveRole(userId: string, circleId: string, allowed: string[]) {
    const m = await this.mustBeMember(userId, circleId);
    if (!allowed.includes(m.role)) {
      throw new NgHttpError({
        statusCode: 403,
        error: 'Forbidden',
        code: NgErrorCodes.FORBIDDEN,
        message: 'Insufficient role for this action',
        timestamp: new Date().toISOString(),
        retryable: false,
        details: { role: m.role, allowed },
      });
    }
    return m;
  }

  /**
   * 获取 Circle 的 owner userId
   */
  async getCircleOwner(circleId: string): Promise<string | null> {
    const owner = await this.membersRepo.findOne({
      where: { circleId, role: 'owner' },
    });
    return owner?.userId ?? null;
  }

  // ==========================================================================
  // 新增方法：圈子详情、修改、删除、退出
  // ==========================================================================

  /**
   * 获取圈子详情
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

    // 获取成员列表
    const members = await this.membersRepo.find({ where: { circleId } });
    const userIds = members.map((m) => m.userId);
    const users = userIds.length ? await this.usersRepo.find({ where: { id: In(userIds) } }) : [];
    const byId = new Map(users.map((u) => [u.id, u]));

    // 找 owner
    const ownerMember = members.find((m) => m.role === 'owner');
    const ownerUser = ownerMember ? byId.get(ownerMember.userId) : null;

    return {
      circle: {
        id: circle.id,
        name: circle.name,
        createdAt: circle.createdAt.toISOString(),
      },
      myRole: membership.role,
      owner: ownerUser
        ? {
            userId: ownerUser.id,
            email: ownerUser.email,
            displayName: ownerUser.displayName,
          }
        : null,
      members: members.map((m) => ({
        userId: m.userId,
        email: byId.get(m.userId)?.email ?? null,
        displayName: byId.get(m.userId)?.displayName ?? null,
        role: m.role,
        joinedAt: m.createdAt.toISOString(),
      })),
      memberCount: members.length,
    };
  }

  /**
   * 更新圈子（仅 owner）
   */
  async updateCircle(requesterUserId: string, circleId: string, dto: { name?: string }) {
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

    if (dto.name !== undefined) {
      circle.name = dto.name;
    }

    await this.circlesRepo.save(circle);

    return {
      circle: {
        id: circle.id,
        name: circle.name,
        createdAt: circle.createdAt.toISOString(),
      },
    };
  }

  /**
   * 删除圈子（仅 owner）
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

    // 先删除所有成员关系
    await this.membersRepo.delete({ circleId });

    // 删除圈子
    await this.circlesRepo.delete({ id: circleId });

    return { deleted: true, circleId };
  }

  /**
   * 退出圈子（非 owner）
   */
  async leaveCircle(requesterUserId: string, circleId: string) {
    const membership = await this.mustBeMember(requesterUserId, circleId);

    // Owner 不能退出，必须先转让
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

    await this.membersRepo.delete({ circleId, userId: requesterUserId });

    return { left: true, circleId };
  }

  /**
   * 转让 owner（仅 owner）
   */
  async transferOwnership(requesterUserId: string, circleId: string, newOwnerUserId: string) {
    await this.mustHaveRole(requesterUserId, circleId, ['owner']);

    // 检查新 owner 是否为成员
    const newOwnerMembership = await this.membersRepo.findOne({
      where: { circleId, userId: newOwnerUserId },
    });
    if (!newOwnerMembership) {
      throw new NgHttpError({
        statusCode: 400,
        error: 'Bad Request',
        code: NgErrorCodes.VALIDATION_ERROR,
        message: 'New owner must be a member of the circle',
        timestamp: new Date().toISOString(),
        retryable: false,
      });
    }

    // 不能转让给自己
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

    // 当前 owner 变为 household
    const currentOwnerMembership = await this.membersRepo.findOne({
      where: { circleId, userId: requesterUserId },
    });
    if (currentOwnerMembership) {
      currentOwnerMembership.role = 'household';
      await this.membersRepo.save(currentOwnerMembership);
    }

    // 新 owner 变为 owner
    newOwnerMembership.role = 'owner';
    await this.membersRepo.save(newOwnerMembership);

    return {
      transferred: true,
      circleId,
      previousOwner: requesterUserId,
      newOwner: newOwnerUserId,
    };
  }
}
