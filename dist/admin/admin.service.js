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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto_1 = require("crypto");
const ng_user_entity_1 = require("../auth/ng-user.entity");
const ng_circle_entity_1 = require("../circles/ng-circle.entity");
const ng_role_entity_1 = require("../roles/ng-role.entity");
let AdminService = class AdminService {
    constructor(usersRepo, circlesRepo, rolesRepo) {
        this.usersRepo = usersRepo;
        this.circlesRepo = circlesRepo;
        this.rolesRepo = rolesRepo;
    }
    async listUsers(opts) {
        const limit = opts?.limit ?? 100;
        const offset = opts?.offset ?? 0;
        const [users, total] = await this.usersRepo.findAndCount({
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });
        return { users, total, limit, offset };
    }
    async getUser(userId) {
        const user = await this.usersRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const roles = await this.rolesRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
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
    async createUser(dto) {
        const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
        if (existing) {
            throw new common_1.ConflictException('Email already exists');
        }
        const user = this.usersRepo.create({
            id: (0, crypto_1.randomUUID)(),
            email: dto.email,
            displayName: dto.displayName ?? null,
            isAdmin: dto.isAdmin ?? false,
            canCreateCircle: false,
        });
        await this.usersRepo.save(user);
        return user;
    }
    async updateUser(userId, dto) {
        const user = await this.usersRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
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
    async deleteUser(userId) {
        const user = await this.usersRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const ownerRoles = await this.rolesRepo.find({
            where: { userId, role: 'owner' },
        });
        if (ownerRoles.length > 0) {
            const circleIds = ownerRoles.map(r => r.circleId);
            throw new common_1.BadRequestException(`Cannot delete user who is Owner of ${ownerRoles.length} circle(s). ` +
                `User must delete their circles first or transfer ownership. ` +
                `Circle IDs: ${circleIds.join(', ')}`);
        }
        await this.rolesRepo.delete({ userId });
        await this.usersRepo.delete({ id: userId });
        return { deleted: true, userId };
    }
    async grantOwner(userId) {
        const user = await this.usersRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.canCreateCircle) {
            return { user, changed: false, message: 'User already has owner permission' };
        }
        user.canCreateCircle = true;
        await this.usersRepo.save(user);
        return { user, changed: true, message: 'Owner permission granted' };
    }
    async revokeOwner(userId) {
        const user = await this.usersRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!user.canCreateCircle) {
            return { user, changed: false, message: 'User does not have owner permission' };
        }
        const ownerRoles = await this.rolesRepo.find({
            where: { userId, role: 'owner' },
        });
        if (ownerRoles.length > 0) {
            throw new common_1.BadRequestException(`Cannot revoke owner permission. User owns ${ownerRoles.length} circle(s). ` +
                `User must delete their circles first.`);
        }
        user.canCreateCircle = false;
        await this.usersRepo.save(user);
        return { user, changed: true, message: 'Owner permission revoked' };
    }
    async listCircles(opts) {
        const limit = opts?.limit ?? 100;
        const offset = opts?.offset ?? 0;
        const [circles, total] = await this.circlesRepo.findAndCount({
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });
        const circlesWithStats = await Promise.all(circles.map(async (circle) => {
            const memberCount = await this.rolesRepo.count({ where: { circleId: circle.id } });
            const ownerRole = await this.rolesRepo.findOne({
                where: { circleId: circle.id, role: 'owner' },
            });
            let ownerUser = null;
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
        }));
        return { circles: circlesWithStats, total, limit, offset };
    }
    async getCircle(circleId) {
        const circle = await this.circlesRepo.findOne({ where: { id: circleId } });
        if (!circle) {
            throw new common_1.NotFoundException('Circle not found');
        }
        const roles = await this.rolesRepo.find({
            where: { circleId },
            order: { createdAt: 'ASC' },
        });
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
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_user_entity_1.NgUser)),
    __param(1, (0, typeorm_1.InjectRepository)(ng_circle_entity_1.NgCircle)),
    __param(2, (0, typeorm_1.InjectRepository)(ng_role_entity_1.NgRole)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AdminService);
//# sourceMappingURL=admin.service.js.map