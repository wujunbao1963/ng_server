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
            ...r,
            circleName: circleMap.get(r.circleId)?.name ?? 'Unknown',
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
        await this.rolesRepo.delete({ userId });
        await this.usersRepo.delete({ id: userId });
        return { deleted: true, userId };
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
            const owner = await this.rolesRepo.findOne({
                where: { circleId: circle.id, role: 'owner' },
            });
            return {
                ...circle,
                memberCount,
                ownerEmail: owner?.email ?? null,
                ownerName: owner?.displayName ?? null,
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
        return { circle, roles };
    }
    async createCircle(dto) {
        const owner = await this.usersRepo.findOne({ where: { id: dto.ownerUserId } });
        if (!owner) {
            throw new common_1.BadRequestException('Owner user not found');
        }
        const circle = this.circlesRepo.create({
            id: (0, crypto_1.randomUUID)(),
            name: dto.name,
        });
        await this.circlesRepo.save(circle);
        const role = this.rolesRepo.create({
            id: (0, crypto_1.randomUUID)(),
            circleId: circle.id,
            userId: owner.id,
            role: 'owner',
            email: owner.email,
            displayName: owner.displayName,
            validFrom: new Date(),
            validUntil: null,
            suspended: false,
            syncVersion: 1,
        });
        await this.rolesRepo.save(role);
        return { circle, ownerRole: role };
    }
    async updateCircle(circleId, dto) {
        const circle = await this.circlesRepo.findOne({ where: { id: circleId } });
        if (!circle) {
            throw new common_1.NotFoundException('Circle not found');
        }
        if (dto.name !== undefined) {
            circle.name = dto.name;
        }
        await this.circlesRepo.save(circle);
        return circle;
    }
    async deleteCircle(circleId) {
        const circle = await this.circlesRepo.findOne({ where: { id: circleId } });
        if (!circle) {
            throw new common_1.NotFoundException('Circle not found');
        }
        await this.rolesRepo.delete({ circleId });
        await this.circlesRepo.delete({ id: circleId });
        return { deleted: true, circleId };
    }
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