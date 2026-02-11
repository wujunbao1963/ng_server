"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RolesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const uuid_1 = require("uuid");
const bcrypt = require("bcrypt");
const ng_role_entity_1 = require("./ng-role.entity");
const VALID_ROLES = ['owner', 'caretaker', 'acting_owner', 'witness'];
let RolesService = RolesService_1 = class RolesService {
    constructor(roleRepo, auditRepo) {
        this.roleRepo = roleRepo;
        this.auditRepo = auditRepo;
        this.logger = new common_1.Logger(RolesService_1.name);
        this.BCRYPT_ROUNDS = 12;
    }
    async createRole(circleId, actorUserId, dto) {
        await this.mustBeOwner(circleId, actorUserId);
        if (!VALID_ROLES.includes(dto.role)) {
            throw new common_1.ForbiddenException(`Invalid role: ${dto.role}`);
        }
        const existing = await this.roleRepo.findOne({
            where: { circleId, userId: dto.userId },
        });
        if (existing) {
            throw new common_1.ForbiddenException('User already has a role in this circle');
        }
        if (dto.role === 'owner') {
            const existingOwner = await this.roleRepo.findOne({
                where: { circleId, role: 'owner' },
            });
            if (existingOwner) {
                throw new common_1.ForbiddenException('Circle already has an owner');
            }
        }
        let pinHash = null;
        if (dto.pin) {
            pinHash = await bcrypt.hash(dto.pin, this.BCRYPT_ROUNDS);
        }
        const role = new ng_role_entity_1.NgRole();
        role.id = (0, uuid_1.v4)();
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
        await this.audit(circleId, role.id, dto.userId, actorUserId, 'create', null, {
            role: role.role,
            validFrom: role.validFrom,
            validUntil: role.validUntil,
        });
        this.logger.log(`Created role ${dto.role} for user ${dto.userId} in circle ${circleId}`);
        return role;
    }
    async updateRole(circleId, roleId, actorUserId, dto) {
        await this.mustBeOwner(circleId, actorUserId);
        const role = await this.roleRepo.findOne({
            where: { id: roleId, circleId },
        });
        if (!role) {
            throw new common_1.NotFoundException('Role not found');
        }
        const oldValues = {};
        const newValues = {};
        if (dto.role !== undefined && dto.role !== role.role) {
            if (!VALID_ROLES.includes(dto.role)) {
                throw new common_1.ForbiddenException(`Invalid role: ${dto.role}`);
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
        role.syncVersion++;
        await this.roleRepo.save(role);
        await this.audit(circleId, role.id, role.userId, actorUserId, 'update', oldValues, newValues);
        return role;
    }
    async suspendRole(circleId, roleId, actorUserId) {
        const role = await this.getRole(circleId, roleId);
        if (role.role === 'owner') {
            throw new common_1.ForbiddenException('Cannot suspend owner');
        }
        await this.mustBeOwner(circleId, actorUserId);
        role.suspended = true;
        role.syncVersion++;
        await this.roleRepo.save(role);
        await this.audit(circleId, role.id, role.userId, actorUserId, 'suspend', { suspended: false }, { suspended: true });
        return role;
    }
    async unsuspendRole(circleId, roleId, actorUserId) {
        await this.mustBeOwner(circleId, actorUserId);
        const role = await this.getRole(circleId, roleId);
        role.suspended = false;
        role.syncVersion++;
        await this.roleRepo.save(role);
        await this.audit(circleId, role.id, role.userId, actorUserId, 'unsuspend', { suspended: true }, { suspended: false });
        return role;
    }
    async revokeRole(circleId, roleId, actorUserId) {
        const role = await this.getRole(circleId, roleId);
        if (role.role === 'owner') {
            throw new common_1.ForbiddenException('Cannot revoke owner role');
        }
        await this.mustBeOwner(circleId, actorUserId);
        await this.audit(circleId, role.id, role.userId, actorUserId, 'revoke', { role: role.role, suspended: role.suspended }, null);
        await this.roleRepo.remove(role);
    }
    async getRole(circleId, roleId) {
        const role = await this.roleRepo.findOne({
            where: { id: roleId, circleId },
        });
        if (!role) {
            throw new common_1.NotFoundException('Role not found');
        }
        return role;
    }
    async getRoleByUserId(circleId, userId) {
        return this.roleRepo.findOne({
            where: { circleId, userId },
        });
    }
    async listRoles(circleId) {
        return this.roleRepo.find({
            where: { circleId },
            order: { role: 'ASC', createdAt: 'ASC' },
        });
    }
    async getRolesForSync(circleId, sinceVersion = 0) {
        const maxResult = await this.roleRepo
            .createQueryBuilder('r')
            .select('MAX(r.sync_version)', 'maxVersion')
            .where('r.circle_id = :circleId', { circleId })
            .getRawOne();
        const serverVersion = maxResult?.maxVersion ?? 0;
        const fullSync = sinceVersion === 0;
        let roles;
        if (fullSync) {
            roles = await this.roleRepo.find({ where: { circleId } });
        }
        else {
            roles = await this.roleRepo.find({
                where: {
                    circleId,
                    syncVersion: (0, typeorm_2.MoreThan)(sinceVersion),
                },
            });
        }
        const syncDtos = roles.map(r => ({
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
    async verifyPin(circleId, userId, pin) {
        const role = await this.getRoleByUserId(circleId, userId);
        if (!role || !role.pinHash) {
            return false;
        }
        return bcrypt.compare(pin, role.pinHash);
    }
    async mustBeOwner(circleId, userId) {
        const role = await this.getRoleByUserId(circleId, userId);
        if (!role || role.role !== 'owner') {
            throw new common_1.ForbiddenException('Only owner can manage roles');
        }
    }
    async audit(circleId, roleId, targetUserId, actorUserId, action, oldValues, newValues) {
        const audit = new ng_role_entity_1.NgRoleAudit();
        audit.id = (0, uuid_1.v4)();
        audit.circleId = circleId;
        audit.roleId = roleId;
        audit.targetUserId = targetUserId;
        audit.actorUserId = actorUserId;
        audit.action = action;
        audit.oldValues = oldValues;
        audit.newValues = newValues;
        await this.auditRepo.save(audit);
    }
};
exports.RolesService = RolesService;
exports.RolesService = RolesService = RolesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_role_entity_1.NgRole)),
    __param(1, (0, typeorm_1.InjectRepository)(ng_role_entity_1.NgRoleAudit)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], RolesService);
//# sourceMappingURL=roles.service.js.map