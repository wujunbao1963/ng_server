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
const update_circle_dto_1 = require("./dto/update-circle.dto");
const circles_service_1 = require("./circles.service");
let CirclesController = class CirclesController {
    constructor(circlesService) {
        this.circlesService = circlesService;
    }
    async createCircle(req, dto) {
        return this.circlesService.createCircle(req.user.userId, dto);
    }
    async listMyCircles(req) {
        return this.circlesService.listMyCircles(req.user.userId);
    }
    async getCircle(req, circleId) {
        return this.circlesService.getCircleDetail(req.user.userId, circleId);
    }
    async updateCircle(req, circleId, dto) {
        return this.circlesService.updateCircle(req.user.userId, circleId, dto);
    }
    async patchCircle(req, circleId, dto) {
        return this.circlesService.updateCircle(req.user.userId, circleId, dto);
    }
    async deleteCircle(req, circleId) {
        return this.circlesService.deleteCircle(req.user.userId, circleId);
    }
    async listMembers(req, circleId) {
        return this.circlesService.listMembers(req.user.userId, circleId);
    }
    async addMember(req, circleId, dto) {
        return this.circlesService.addMember(req.user.userId, circleId, dto);
    }
    async removeMember(req, circleId, userId) {
        return this.circlesService.removeMember(req.user.userId, circleId, userId);
    }
    async leaveCircle(req, circleId) {
        return this.circlesService.leaveCircle(req.user.userId, circleId);
    }
    async transferOwnership(req, circleId, dto) {
        return this.circlesService.transferOwnership(req.user.userId, circleId, dto.newOwnerUserId);
    }
};
exports.CirclesController = CirclesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_circle_dto_1.CreateCircleDto]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "createCircle", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "listMyCircles", null);
__decorate([
    (0, common_1.Get)(':circleId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "getCircle", null);
__decorate([
    (0, common_1.Put)(':circleId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_circle_dto_1.UpdateCircleDto]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "updateCircle", null);
__decorate([
    (0, common_1.Patch)(':circleId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_circle_dto_1.UpdateCircleDto]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "patchCircle", null);
__decorate([
    (0, common_1.Delete)(':circleId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "deleteCircle", null);
__decorate([
    (0, common_1.Get)(':circleId/members'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "listMembers", null);
__decorate([
    (0, common_1.Post)(':circleId/members'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, add_circle_member_dto_1.AddCircleMemberDto]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "addMember", null);
__decorate([
    (0, common_1.Delete)(':circleId/members/:userId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Param)('userId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "removeMember", null);
__decorate([
    (0, common_1.Post)(':circleId/leave'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "leaveCircle", null);
__decorate([
    (0, common_1.Post)(':circleId/transfer'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "transferOwnership", null);
exports.CirclesController = CirclesController = __decorate([
    (0, common_1.Controller)('api/circles'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [circles_service_1.CirclesService])
], CirclesController);
//# sourceMappingURL=circles.controller.js.map