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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const typeorm_2 = require("typeorm");
const ng_user_entity_1 = require("./ng-user.entity");
const ng_role_entity_1 = require("../roles/ng-role.entity");
const ng_circle_entity_1 = require("../circles/ng-circle.entity");
const INVITE_CODE = '587585';
const BCRYPT_ROUNDS = 12;
let AuthService = class AuthService {
    constructor(usersRepo, rolesRepo, circlesRepo, jwt) {
        this.usersRepo = usersRepo;
        this.rolesRepo = rolesRepo;
        this.circlesRepo = circlesRepo;
        this.jwt = jwt;
    }
    async register(email, password, displayName, inviteCode) {
        if (inviteCode !== INVITE_CODE) {
            throw new common_1.BadRequestException('Invalid invite code');
        }
        const existing = await this.usersRepo.findOne({ where: { email } });
        if (existing) {
            throw new common_1.ConflictException('Email already registered');
        }
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const user = this.usersRepo.create({
            id: crypto.randomUUID(),
            email,
            displayName: displayName ?? null,
            passwordHash,
            isAdmin: false,
            canCreateCircle: false,
        });
        await this.usersRepo.save(user);
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
    async login(email, password) {
        const user = await this.usersRepo.findOne({ where: { email } });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        if (!user.passwordHash) {
            throw new common_1.UnauthorizedException('Password not set. Please contact admin.');
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
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
    async devLogin(email, displayName) {
        let user = await this.usersRepo.findOne({ where: { email } });
        if (!user) {
            user = this.usersRepo.create({
                id: crypto.randomUUID(),
                email,
                displayName: displayName ?? null,
            });
        }
        else if (displayName && user.displayName !== displayName) {
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
    async getCurrentUser(userId) {
        const user = await this.usersRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
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
    async getMyRoleInCircle(userId, circleId) {
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_user_entity_1.NgUser)),
    __param(1, (0, typeorm_1.InjectRepository)(ng_role_entity_1.NgRole)),
    __param(2, (0, typeorm_1.InjectRepository)(ng_circle_entity_1.NgCircle)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map