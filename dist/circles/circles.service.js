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
const ng_circle_member_entity_1 = require("./ng-circle-member.entity");
const ng_user_entity_1 = require("../auth/ng-user.entity");
const ng_http_error_1 = require("../common/errors/ng-http-error");
let CirclesService = class CirclesService {
    constructor(circlesRepo, membersRepo, usersRepo) {
        this.circlesRepo = circlesRepo;
        this.membersRepo = membersRepo;
        this.usersRepo = usersRepo;
    }
    async createCircle(ownerUserId, name) {
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
    async listMyCircles(userId) {
        const memberships = await this.membersRepo.find({ where: { userId } });
        const circleIds = memberships.map((m) => m.circleId);
        if (circleIds.length === 0) {
            return { circles: [], count: 0 };
        }
        const circles = await this.circlesRepo.find({ where: { id: (0, typeorm_2.In)(circleIds) } });
        const byId = new Map(circles.map((c) => [c.id, c]));
        const ordered = circleIds.map((id) => byId.get(id)).filter(Boolean);
        return { circles: ordered.map((c) => ({ id: c.id, name: c.name })), count: ordered.length };
    }
    async listMembers(requesterUserId, circleId) {
        await this.mustBeMember(requesterUserId, circleId);
        const members = await this.membersRepo.find({ where: { circleId } });
        const userIds = members.map((m) => m.userId);
        const users = userIds.length ? await this.usersRepo.find({ where: { id: (0, typeorm_2.In)(userIds) } }) : [];
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
    async addMember(requesterUserId, circleId, dto) {
        await this.mustHaveRole(requesterUserId, circleId, ['owner', 'household']);
        const user = await this.usersRepo.findOne({ where: { email: dto.email } });
        if (!user) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: ng_http_error_1.NgErrorCodes.NOT_FOUND,
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
    async mustBeMember(userId, circleId) {
        const m = await this.membersRepo.findOne({ where: { userId, circleId } });
        if (!m) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 403,
                error: 'Forbidden',
                code: ng_http_error_1.NgErrorCodes.FORBIDDEN,
                message: 'Not a circle member',
                timestamp: new Date().toISOString(),
                retryable: false,
            });
        }
        return m;
    }
    async mustHaveRole(userId, circleId, allowed) {
        const m = await this.mustBeMember(userId, circleId);
        if (!allowed.includes(m.role)) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 403,
                error: 'Forbidden',
                code: ng_http_error_1.NgErrorCodes.FORBIDDEN,
                message: 'Insufficient role for this action',
                timestamp: new Date().toISOString(),
                retryable: false,
                details: { role: m.role, allowed },
            });
        }
        return m;
    }
    async getCircleOwner(circleId) {
        const owner = await this.membersRepo.findOne({
            where: { circleId, role: 'owner' },
        });
        return owner?.userId ?? null;
    }
};
exports.CirclesService = CirclesService;
exports.CirclesService = CirclesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_circle_entity_1.NgCircle)),
    __param(1, (0, typeorm_1.InjectRepository)(ng_circle_member_entity_1.NgCircleMember)),
    __param(2, (0, typeorm_1.InjectRepository)(ng_user_entity_1.NgUser)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], CirclesService);
//# sourceMappingURL=circles.service.js.map