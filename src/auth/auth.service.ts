import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { NgUser } from './ng-user.entity';
import { NgRole } from '../roles/ng-role.entity';
import { NgCircle } from '../circles/ng-circle.entity';

// 固定的注册邀请码
const INVITE_CODE = '587585';
const BCRYPT_ROUNDS = 12;

export interface UserWithCircles {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  canCreateCircle: boolean;
  circles: Array<{
    circleId: string;
    circleName: string;
    role: string;
    validFrom: string;
    validUntil: string | null;
    suspended: boolean;
  }>;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(NgUser) private readonly usersRepo: Repository<NgUser>,
    @InjectRepository(NgRole) private readonly rolesRepo: Repository<NgRole>,
    @InjectRepository(NgCircle) private readonly circlesRepo: Repository<NgCircle>,
    private readonly jwt: JwtService,
  ) {}

  // ===========================================================================
  // 用户注册 (自助注册，需要邀请码)
  // ===========================================================================

  /**
   * 用户注册
   * 
   * POST /api/auth/register
   * { email, password, displayName?, inviteCode }
   */
  async register(
    email: string,
    password: string,
    displayName?: string,
    inviteCode?: string,
  ) {
    // 验证邀请码
    if (inviteCode !== INVITE_CODE) {
      throw new BadRequestException('Invalid invite code');
    }

    // 检查邮箱是否已存在
    const existing = await this.usersRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // 密码哈希
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // 创建用户
    const user = this.usersRepo.create({
      id: crypto.randomUUID(),
      email,
      displayName: displayName ?? null,
      passwordHash,
      isAdmin: false,
      canCreateCircle: false,
    });
    await this.usersRepo.save(user);

    // 生成 JWT
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
        canCreateCircle: user.canCreateCircle,
      },
    };
  }

  // ===========================================================================
  // 用户登录
  // ===========================================================================

  /**
   * 用户登录
   * 
   * POST /api/auth/login
   * { email, password }
   */
  async login(email: string, password: string) {
    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 检查是否设置了密码
    if (!user.passwordHash) {
      throw new UnauthorizedException('Password not set. Please contact admin.');
    }

    // 验证密码
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 生成 JWT
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
        canCreateCircle: user.canCreateCircle,
      },
    };
  }

  // ===========================================================================
  // Dev Login (保留用于测试)
  // ===========================================================================

  /**
   * Dev-only login for local tests and early integration.
   * Creates/updates a user record and returns a signed JWT.
   */
  async devLogin(email: string, displayName?: string) {
    let user = await this.usersRepo.findOne({ where: { email } });
    if (!user) {
      user = this.usersRepo.create({
        id: crypto.randomUUID(),
        email,
        displayName: displayName ?? null,
      });
    } else if (displayName && user.displayName !== displayName) {
      user.displayName = displayName;
    }
    await this.usersRepo.save(user);

    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isAdmin: user.isAdmin ?? false,
        canCreateCircle: user.canCreateCircle ?? false,
      },
    };
  }

  // ===========================================================================
  // 获取当前用户信息
  // ===========================================================================

  /**
   * 获取当前用户信息，包含所有 Circle 角色
   * 
   * GET /api/auth/me
   */
  async getCurrentUser(userId: string): Promise<UserWithCircles> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
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

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isAdmin: user.isAdmin ?? false,
      canCreateCircle: user.canCreateCircle ?? false,
      circles: roles.map(r => ({
        circleId: r.circleId,
        circleName: circleMap.get(r.circleId)?.name ?? 'Unknown',
        role: r.role,
        validFrom: r.validFrom.toISOString(),
        validUntil: r.validUntil?.toISOString() ?? null,
        suspended: r.suspended,
      })),
    };
  }

  // ===========================================================================
  // 获取用户在特定 Circle 的角色
  // ===========================================================================

  /**
   * 获取用户在特定 Circle 的角色
   * 
   * GET /api/circles/:circleId/my-role
   */
  async getMyRoleInCircle(userId: string, circleId: string): Promise<{
    role: string | null;
    validFrom: string | null;
    validUntil: string | null;
    suspended: boolean;
    permissions: string[] | null;
  }> {
    const role = await this.rolesRepo.findOne({
      where: { userId, circleId },
    });

    if (!role) {
      return {
        role: null,
        validFrom: null,
        validUntil: null,
        suspended: false,
        permissions: null,
      };
    }

    return {
      role: role.role,
      validFrom: role.validFrom.toISOString(),
      validUntil: role.validUntil?.toISOString() ?? null,
      suspended: role.suspended,
      permissions: role.permissions,
    };
  }
}
