import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { NgRole, NgRoleAudit } from './ng-role.entity';

// Valid roles per Constitution §3
const VALID_ROLES = ['owner', 'caretaker', 'acting_owner', 'witness'];

export interface CreateRoleDto {
  userId: string;
  role: string;
  email?: string;
  displayName?: string;
  validFrom?: Date;
  validUntil?: Date;
  pin?: string;
  permissions?: string[];
}

export interface UpdateRoleDto {
  role?: string;
  email?: string;
  displayName?: string;
  validFrom?: Date;
  validUntil?: Date;
  suspended?: boolean;
  pin?: string;
  permissions?: string[];
}

export interface RoleSyncDto {
  userId: string;
  role: string;
  email?: string | null;
  displayName?: string | null;
  validFrom: string;
  validUntil?: string | null;
  suspended: boolean;
  syncVersion: number;
}

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);
  private readonly BCRYPT_ROUNDS = 12;

  constructor(
    @InjectRepository(NgRole)
    private readonly roleRepo: Repository<NgRole>,
    @InjectRepository(NgRoleAudit)
    private readonly auditRepo: Repository<NgRoleAudit>,
  ) {}

  /**
   * Create a new role assignment.
   * 
   * Only Owner can create roles (Constitution §3.6).
   */
  async createRole(
    circleId: string,
    actorUserId: string,
    dto: CreateRoleDto,
  ): Promise<NgRole> {
    // Validate actor is owner
    await this.mustBeOwner(circleId, actorUserId);

    // Validate role value
    if (!VALID_ROLES.includes(dto.role)) {
      throw new ForbiddenException(`Invalid role: ${dto.role}`);
    }

    // Check for existing assignment
    const existing = await this.roleRepo.findOne({
      where: { circleId, userId: dto.userId },
    });
    if (existing) {
      throw new ForbiddenException('User already has a role in this circle');
    }

    // Only one owner per circle
    if (dto.role === 'owner') {
      const existingOwner = await this.roleRepo.findOne({
        where: { circleId, role: 'owner' },
      });
      if (existingOwner) {
        throw new ForbiddenException('Circle already has an owner');
      }
    }

    // Hash PIN if provided
    let pinHash: string | null = null;
    if (dto.pin) {
      pinHash = await bcrypt.hash(dto.pin, this.BCRYPT_ROUNDS);
    }

    const role = new NgRole();
    role.id = uuidv4();
    role.circleId = circleId;
    role.userId = dto.userId;
    role.role = dto.role;
    role.email = dto.email ?? null;
    role.displayName = dto.displayName ?? null;
    role.validFrom = dto.validFrom ?? new Date();
    role.validUntil = dto.validUntil ?? null;
    role.suspended = false;
    role.pinHash = pinHash;
    role.permissions = dto.permissions ?? null;
    role.syncVersion = 1;

    await this.roleRepo.save(role);

    // Audit
    await this.audit(circleId, role.id, dto.userId, actorUserId, 'create', null, {
      role: role.role,
      validFrom: role.validFrom,
      validUntil: role.validUntil,
    });

    this.logger.log(`Created role ${dto.role} for user ${dto.userId} in circle ${circleId}`);
    return role;
  }

  /**
   * Update a role assignment.
   */
  async updateRole(
    circleId: string,
    roleId: string,
    actorUserId: string,
    dto: UpdateRoleDto,
  ): Promise<NgRole> {
    await this.mustBeOwner(circleId, actorUserId);

    const role = await this.roleRepo.findOne({
      where: { id: roleId, circleId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};

    if (dto.role !== undefined && dto.role !== role.role) {
      if (!VALID_ROLES.includes(dto.role)) {
        throw new ForbiddenException(`Invalid role: ${dto.role}`);
      }
      oldValues.role = role.role;
      newValues.role = dto.role;
      role.role = dto.role;
    }

    if (dto.email !== undefined) {
      oldValues.email = role.email;
      newValues.email = dto.email;
      role.email = dto.email ?? null;
    }

    if (dto.displayName !== undefined) {
      oldValues.displayName = role.displayName;
      newValues.displayName = dto.displayName;
      role.displayName = dto.displayName ?? null;
    }

    if (dto.validFrom !== undefined) {
      oldValues.validFrom = role.validFrom;
      newValues.validFrom = dto.validFrom;
      role.validFrom = dto.validFrom;
    }

    if (dto.validUntil !== undefined) {
      oldValues.validUntil = role.validUntil;
      newValues.validUntil = dto.validUntil;
      role.validUntil = dto.validUntil ?? null;
    }

    if (dto.suspended !== undefined) {
      oldValues.suspended = role.suspended;
      newValues.suspended = dto.suspended;
      role.suspended = dto.suspended;
    }

    if (dto.pin !== undefined) {
      role.pinHash = dto.pin ? await bcrypt.hash(dto.pin, this.BCRYPT_ROUNDS) : null;
      newValues.pinUpdated = true;
    }

    if (dto.permissions !== undefined) {
      oldValues.permissions = role.permissions;
      newValues.permissions = dto.permissions;
      role.permissions = dto.permissions ?? null;
    }

    // Increment sync version
    role.syncVersion++;

    await this.roleRepo.save(role);

    await this.audit(circleId, role.id, role.userId, actorUserId, 'update', oldValues, newValues);

    return role;
  }

  /**
   * Suspend a role.
   */
  async suspendRole(
    circleId: string,
    roleId: string,
    actorUserId: string,
  ): Promise<NgRole> {
    const role = await this.getRole(circleId, roleId);
    
    if (role.role === 'owner') {
      throw new ForbiddenException('Cannot suspend owner');
    }

    await this.mustBeOwner(circleId, actorUserId);

    role.suspended = true;
    role.syncVersion++;
    await this.roleRepo.save(role);

    await this.audit(circleId, role.id, role.userId, actorUserId, 'suspend', 
      { suspended: false }, { suspended: true });

    return role;
  }

  /**
   * Unsuspend a role.
   */
  async unsuspendRole(
    circleId: string,
    roleId: string,
    actorUserId: string,
  ): Promise<NgRole> {
    await this.mustBeOwner(circleId, actorUserId);

    const role = await this.getRole(circleId, roleId);
    role.suspended = false;
    role.syncVersion++;
    await this.roleRepo.save(role);

    await this.audit(circleId, role.id, role.userId, actorUserId, 'unsuspend',
      { suspended: true }, { suspended: false });

    return role;
  }

  /**
   * Revoke (delete) a role.
   */
  async revokeRole(
    circleId: string,
    roleId: string,
    actorUserId: string,
  ): Promise<void> {
    const role = await this.getRole(circleId, roleId);
    
    if (role.role === 'owner') {
      throw new ForbiddenException('Cannot revoke owner role');
    }

    await this.mustBeOwner(circleId, actorUserId);

    await this.audit(circleId, role.id, role.userId, actorUserId, 'revoke',
      { role: role.role, suspended: role.suspended }, null);

    await this.roleRepo.remove(role);
  }

  /**
   * Get a single role by ID.
   */
  async getRole(circleId: string, roleId: string): Promise<NgRole> {
    const role = await this.roleRepo.findOne({
      where: { id: roleId, circleId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  /**
   * Get role by user ID.
   */
  async getRoleByUserId(circleId: string, userId: string): Promise<NgRole | null> {
    return this.roleRepo.findOne({
      where: { circleId, userId },
    });
  }

  /**
   * List all roles in a circle.
   */
  async listRoles(circleId: string): Promise<NgRole[]> {
    return this.roleRepo.find({
      where: { circleId },
      order: { role: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * Get roles updated since a specific version (for Edge sync).
   */
  async getRolesForSync(
    circleId: string,
    sinceVersion: number = 0,
  ): Promise<{ roles: RoleSyncDto[]; serverVersion: number; fullSync: boolean }> {
    // Get max sync version
    const maxResult = await this.roleRepo
      .createQueryBuilder('r')
      .select('MAX(r.sync_version)', 'maxVersion')
      .where('r.circle_id = :circleId', { circleId })
      .getRawOne();
    
    const serverVersion = maxResult?.maxVersion ?? 0;

    // If sinceVersion is 0, return all (full sync)
    const fullSync = sinceVersion === 0;

    let roles: NgRole[];
    if (fullSync) {
      roles = await this.roleRepo.find({ where: { circleId } });
    } else {
      roles = await this.roleRepo.find({
        where: {
          circleId,
          syncVersion: MoreThan(sinceVersion),
        },
      });
    }

    const syncDtos: RoleSyncDto[] = roles.map(r => ({
      userId: r.userId,
      role: r.role,
      email: r.email,
      displayName: r.displayName,
      validFrom: r.validFrom.toISOString(),
      validUntil: r.validUntil?.toISOString() ?? null,
      suspended: r.suspended,
      syncVersion: r.syncVersion,
    }));

    return {
      roles: syncDtos,
      serverVersion,
      fullSync,
    };
  }

  /**
   * Verify PIN for a user.
   */
  async verifyPin(circleId: string, userId: string, pin: string): Promise<boolean> {
    const role = await this.getRoleByUserId(circleId, userId);
    if (!role || !role.pinHash) {
      return false;
    }
    return bcrypt.compare(pin, role.pinHash);
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private async mustBeOwner(circleId: string, userId: string): Promise<void> {
    const role = await this.getRoleByUserId(circleId, userId);
    if (!role || role.role !== 'owner') {
      throw new ForbiddenException('Only owner can manage roles');
    }
  }

  private async audit(
    circleId: string,
    roleId: string,
    targetUserId: string,
    actorUserId: string,
    action: string,
    oldValues: Record<string, any> | null,
    newValues: Record<string, any> | null,
  ): Promise<void> {
    const audit = new NgRoleAudit();
    audit.id = uuidv4();
    audit.circleId = circleId;
    audit.roleId = roleId;
    audit.targetUserId = targetUserId;
    audit.actorUserId = actorUserId;
    audit.action = action;
    audit.oldValues = oldValues;
    audit.newValues = newValues;
    await this.auditRepo.save(audit);
  }
}
