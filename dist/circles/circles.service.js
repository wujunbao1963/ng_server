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
exports.CirclesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const crypto = require("crypto");
const typeorm_2 = require("typeorm");
const ng_circle_entity_1 = require("./ng-circle.entity");
const ng_user_entity_1 = require("../auth/ng-user.entity");
const ng_role_entity_1 = require("../roles/ng-role.entity");
const ng_http_error_1 = require("../common/errors/ng-http-error");
let CirclesService = class CirclesService {
    constructor(circlesRepo, rolesRepo, usersRepo) {
        this.circlesRepo = circlesRepo;
        this.rolesRepo = rolesRepo;
        this.usersRepo = usersRepo;
    }
    async createCircle(ownerUserId, dto) {
        const user = await this.usersRepo.findOne({ where: { id: ownerUserId } });
        if (!user) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 401,
                error: 'Unauthorized',
                code: ng_http_error_1.NgErrorCodes.UNAUTHORIZED,
                message: 'User not found',
                timestamp: new Date().toISOString(),
                retryable: false,
            });
        }
        if (!user.canCreateCircle) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 403,
                error: 'Forbidden',
                code: ng_http_error_1.NgErrorCodes.FORBIDDEN,
                message: 'You do not have permission to create circles. Contact admin to grant owner permission.',
                timestamp: new Date().toISOString(),
                retryable: false,
            });
        }
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
        const role = this.rolesRepo.create({
            id: crypto.randomUUID(),
            circleId,
            userId: ownerUserId,
            role: 'owner',
            email: user.email,
            displayName: user.displayName,
            validFrom: new Date(),
            validUntil: null,
            suspended: false,
            syncVersion: 1,
        });
        await this.rolesRepo.save(role);
        return {
            circle: this.formatCircle(circle),
            role: this.formatRole(role),
        };
    }
    async listMyCircles(userId) {
        const roles = await this.rolesRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
        const circleIds = roles.map(r => r.circleId);
        if (circleIds.length === 0) {
            return { circles: [], count: 0 };
        }
        const circles = await this.circlesRepo.find({ where: { id: (0, typeorm_2.In)(circleIds) } });
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
    async getCircleDetail(requesterUserId, circleId) {
        const membership = await this.mustBeMember(requesterUserId, circleId);
        const circle = await this.circlesRepo.findOne({ where: { id: circleId } });
        if (!circle) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: ng_http_error_1.NgErrorCodes.NOT_FOUND,
                message: 'Circle not found',
                timestamp: new Date().toISOString(),
                retryable: false,
            });
        }
        const roles = await this.rolesRepo.find({
            where: { circleId },
            order: { createdAt: 'ASC' },
        });
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
    async updateCircle(requesterUserId, circleId, dto) {
        await this.mustHaveRole(requesterUserId, circleId, ['owner']);
        const circle = await this.circlesRepo.findOne({ where: { id: circleId } });
        if (!circle) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: ng_http_error_1.NgErrorCodes.NOT_FOUND,
                message: 'Circle not found',
                timestamp: new Date().toISOString(),
                retryable: false,
            });
        }
        if (dto.name !== undefined)
            circle.name = dto.name;
        if (dto.propertyType !== undefined)
            circle.propertyType = dto.propertyType;
        if (dto.address !== undefined)
            circle.address = dto.address;
        if (dto.city !== undefined)
            circle.city = dto.city;
        if (dto.state !== undefined)
            circle.state = dto.state;
        if (dto.postalCode !== undefined)
            circle.postalCode = dto.postalCode;
        if (dto.country !== undefined)
            circle.country = dto.country;
        if (dto.latitude !== undefined)
            circle.latitude = dto.latitude;
        if (dto.longitude !== undefined)
            circle.longitude = dto.longitude;
        if (dto.proximityRadiusM !== undefined)
            circle.proximityRadiusM = dto.proximityRadiusM;
        await this.circlesRepo.save(circle);
        return { circle: this.formatCircle(circle) };
    }
    async deleteCircle(requesterUserId, circleId) {
        await this.mustHaveRole(requesterUserId, circleId, ['owner']);
        const circle = await this.circlesRepo.findOne({ where: { id: circleId } });
        if (!circle) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: ng_http_error_1.NgErrorCodes.NOT_FOUND,
                message: 'Circle not found',
                timestamp: new Date().toISOString(),
                retryable: false,
            });
        }
        await this.rolesRepo.delete({ circleId });
        await this.circlesRepo.delete({ id: circleId });
        return { deleted: true, circleId };
    }
    async listMembers(requesterUserId, circleId) {
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
    async addMember(requesterUserId, circleId, dto) {
        await this.mustHaveRole(requesterUserId, circleId, ['owner']);
        const user = await this.usersRepo.findOne({ where: { email: dto.email } });
        if (!user) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: ng_http_error_1.NgErrorCodes.NOT_FOUND,
                message: 'User not found. They must register first.',
                timestamp: new Date().toISOString(),
                retryable: false,
                details: { email: dto.email },
            });
        }
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
        const validRoles = ['caretaker', 'acting_owner', 'witness'];
        if (!validRoles.includes(dto.role)) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 400,
                error: 'Bad Request',
                code: ng_http_error_1.NgErrorCodes.VALIDATION_ERROR,
                message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
                timestamp: new Date().toISOString(),
                retryable: false,
            });
        }
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
    async removeMember(requesterUserId, circleId, targetUserId) {
        await this.mustHaveRole(requesterUserId, circleId, ['owner']);
        if (targetUserId === requesterUserId) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 400,
                error: 'Bad Request',
                code: ng_http_error_1.NgErrorCodes.VALIDATION_ERROR,
                message: 'Cannot remove yourself. Transfer ownership first or delete the circle.',
                timestamp: new Date().toISOString(),
                retryable: false,
            });
        }
        const role = await this.rolesRepo.findOne({
            where: { circleId, userId: targetUserId },
        });
        if (!role) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: ng_http_error_1.NgErrorCodes.NOT_FOUND,
                message: 'Member not found',
                timestamp: new Date().toISOString(),
                retryable: false,
            });
        }
        await this.rolesRepo.delete({ id: role.id });
        return { removed: true, userId: targetUserId };
    }
    async leaveCircle(requesterUserId, circleId) {
        const membership = await this.mustBeMember(requesterUserId, circleId);
        if (membership.role === 'owner') {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 400,
                error: 'Bad Request',
                code: ng_http_error_1.NgErrorCodes.VALIDATION_ERROR,
                message: 'Owner cannot leave circle. Transfer ownership first or delete the circle.',
                timestamp: new Date().toISOString(),
                retryable: false,
            });
        }
        await this.rolesRepo.delete({ id: membership.id });
        return { left: true, circleId };
    }
    async transferOwnership(requesterUserId, circleId, newOwnerUserId) {
        await this.mustHaveRole(requesterUserId, circleId, ['owner']);
        if (newOwnerUserId === requesterUserId) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 400,
                error: 'Bad Request',
                code: ng_http_error_1.NgErrorCodes.VALIDATION_ERROR,
                message: 'Cannot transfer ownership to yourself',
                timestamp: new Date().toISOString(),
                retryable: false,
            });
        }
        const newOwnerRole = await this.rolesRepo.findOne({
            where: { circleId, userId: newOwnerUserId },
        });
        if (!newOwnerRole) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 400,
                error: 'Bad Request',
                code: ng_http_error_1.NgErrorCodes.VALIDATION_ERROR,
                message: 'New owner must be a member of the circle',
                timestamp: new Date().toISOString(),
                retryable: false,
            });
        }
        const currentOwnerRole = await this.rolesRepo.findOne({
            where: { circleId, userId: requesterUserId },
        });
        if (currentOwnerRole) {
            currentOwnerRole.role = 'caretaker';
            currentOwnerRole.syncVersion += 1;
            await this.rolesRepo.save(currentOwnerRole);
        }
        newOwnerRole.role = 'owner';
        newOwnerRole.validUntil = null;
        newOwnerRole.syncVersion += 1;
        await this.rolesRepo.save(newOwnerRole);
        return {
            transferred: true,
            circleId,
            previousOwner: requesterUserId,
            newOwner: newOwnerUserId,
        };
    }
    async getCircleOwner(circleId) {
        const owner = await this.rolesRepo.findOne({
            where: { circleId, role: 'owner' },
        });
        return owner?.userId ?? null;
    }
    async getWitnessUserIds(circleId) {
        const roles = await this.rolesRepo.find({
            where: { circleId, role: (0, typeorm_2.In)(['owner', 'caretaker', 'witness', 'acting_owner']), suspended: false },
        });
        return roles.map(r => r.userId);
    }
    async mustBeMember(userId, circleId) {
        const role = await this.rolesRepo.findOne({ where: { userId, circleId } });
        if (!role) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 403,
                error: 'Forbidden',
                code: ng_http_error_1.NgErrorCodes.FORBIDDEN,
                message: 'Not a circle member',
                timestamp: new Date().toISOString(),
                retryable: false,
            });
        }
        return role;
    }
    async mustHaveRole(userId, circleId, allowed) {
        const role = await this.mustBeMember(userId, circleId);
        if (!allowed.includes(role.role)) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 403,
                error: 'Forbidden',
                code: ng_http_error_1.NgErrorCodes.FORBIDDEN,
                message: 'Insufficient role for this action',
                timestamp: new Date().toISOString(),
                retryable: false,
                details: { role: role.role, allowed },
            });
        }
        return role;
    }
    formatCircle(circle) {
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
    formatRole(role) {
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
};
exports.CirclesService = CirclesService;
exports.CirclesService = CirclesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_circle_entity_1.NgCircle)),
    __param(1, (0, typeorm_1.InjectRepository)(ng_role_entity_1.NgRole)),
    __param(2, (0, typeorm_1.InjectRepository)(ng_user_entity_1.NgUser)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], CirclesService);
//# sourceMappingURL=circles.service.js.map