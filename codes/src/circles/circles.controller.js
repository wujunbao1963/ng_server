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
exports.CirclesController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const create_circle_dto_1 = require("./dto/create-circle.dto");
const add_circle_member_dto_1 = require("./dto/add-circle-member.dto");
const circles_service_1 = require("./circles.service");
let CirclesController = class CirclesController {
    constructor(circlesService) {
        this.circlesService = circlesService;
    }
    async createCircle(req, dto) {
        return this.circlesService.createCircle(req.user.userId, dto.name);
    }
    async listMyCircles(req) {
        return this.circlesService.listMyCircles(req.user.userId);
    }
    async listMembers(req, circleId) {
        return this.circlesService.listMembers(req.user.userId, circleId);
    }
    async addMember(req, circleId, dto) {
        return this.circlesService.addMember(req.user.userId, circleId, dto);
    }
};
exports.CirclesController = CirclesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_circle_dto_1.CreateCircleDto]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "createCircle", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "listMyCircles", null);
__decorate([
    (0, common_1.Get)(':circleId/members'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "listMembers", null);
__decorate([
    (0, common_1.Post)(':circleId/members'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, add_circle_member_dto_1.AddCircleMemberDto]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "addMember", null);
exports.CirclesController = CirclesController = __decorate([
    (0, common_1.Controller)('api/circles'),
    __metadata("design:paramtypes", [circles_service_1.CirclesService])
], CirclesController);
//# sourceMappingURL=circles.controller.js.map