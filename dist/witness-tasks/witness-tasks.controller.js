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
exports.WitnessTasksController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const witness_tasks_service_1 = require("./witness-tasks.service");
let WitnessTasksController = class WitnessTasksController {
    constructor(tasksService) {
        this.tasksService = tasksService;
    }
    async createTask(circleId, dto, req) {
        const task = await this.tasksService.createTask(req.user.userId, circleId, dto);
        return { task: this.formatTask(task) };
    }
    async listTasks(circleId, status, limit, offset, req) {
        const result = await this.tasksService.listTasks(req.user.userId, circleId, {
            status,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        });
        return {
            tasks: result.tasks.map(t => this.formatTask(t)),
            total: result.total,
        };
    }
    async listAvailableTasks(circleId, req) {
        const tasks = await this.tasksService.listAvailableTasks(req.user.userId, circleId);
        return { tasks: tasks.map(t => this.formatTask(t)) };
    }
    async getTask(circleId, taskId, req) {
        const task = await this.tasksService.getTask(req.user.userId, circleId, taskId);
        return { task: this.formatTask(task) };
    }
    async offerTask(circleId, taskId, req) {
        const task = await this.tasksService.offerTask(req.user.userId, circleId, taskId);
        return { task: this.formatTask(task) };
    }
    async claimTask(circleId, taskId, dto, req) {
        const task = await this.tasksService.claimTask(req.user.userId, circleId, taskId, dto);
        return { task: this.formatTask(task) };
    }
    async arriveAtTask(circleId, taskId, dto, req) {
        const task = await this.tasksService.arriveAtTask(req.user.userId, circleId, taskId, dto);
        return { task: this.formatTask(task) };
    }
    async submitTask(circleId, taskId, dto, req) {
        const task = await this.tasksService.submitTask(req.user.userId, circleId, taskId, dto);
        return { task: this.formatTask(task) };
    }
    async closeTask(circleId, taskId, req) {
        const task = await this.tasksService.closeTask(req.user.userId, circleId, taskId);
        return { task: this.formatTask(task) };
    }
    async cancelTask(circleId, taskId, dto, req) {
        const task = await this.tasksService.cancelTask(req.user.userId, circleId, taskId, dto.reason);
        return { task: this.formatTask(task) };
    }
    async listMyTasks(req) {
        const tasks = await this.tasksService.listMyTasks(req.user.userId);
        return { tasks: tasks.map(t => this.formatTask(t)) };
    }
    formatTask(task) {
        return {
            id: task.id,
            circleId: task.circleId,
            eventId: task.eventId,
            title: task.title,
            description: task.description,
            status: task.status,
            creatorUserId: task.creatorUserId,
            creatorRole: task.creatorRole,
            witnessUserId: task.witnessUserId,
            createdAt: task.createdAt?.toISOString?.() ?? task.createdAt,
            offeredAt: task.offeredAt?.toISOString?.() ?? task.offeredAt,
            claimedAt: task.claimedAt?.toISOString?.() ?? task.claimedAt,
            arrivedAt: task.arrivedAt?.toISOString?.() ?? task.arrivedAt,
            submittedAt: task.submittedAt?.toISOString?.() ?? task.submittedAt,
            closedAt: task.closedAt?.toISOString?.() ?? task.closedAt,
            canceledAt: task.canceledAt?.toISOString?.() ?? task.canceledAt,
            expiresAt: task.expiresAt?.toISOString?.() ?? task.expiresAt,
            proximityVerified: task.proximityVerified,
            proximityFailureReason: task.proximityFailureReason,
            submissionNotes: task.submissionNotes,
            submissionPhotos: task.submissionPhotos,
            cancelReason: task.cancelReason,
        };
    }
};
exports.WitnessTasksController = WitnessTasksController;
__decorate([
    (0, common_1.Post)('api/circles/:circleId/witness-tasks'),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], WitnessTasksController.prototype, "createTask", null);
__decorate([
    (0, common_1.Get)('api/circles/:circleId/witness-tasks'),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('offset')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], WitnessTasksController.prototype, "listTasks", null);
__decorate([
    (0, common_1.Get)('api/circles/:circleId/witness-tasks/available'),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WitnessTasksController.prototype, "listAvailableTasks", null);
__decorate([
    (0, common_1.Get)('api/circles/:circleId/witness-tasks/:taskId'),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('taskId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], WitnessTasksController.prototype, "getTask", null);
__decorate([
    (0, common_1.Post)('api/circles/:circleId/witness-tasks/:taskId/offer'),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('taskId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], WitnessTasksController.prototype, "offerTask", null);
__decorate([
    (0, common_1.Post)('api/circles/:circleId/witness-tasks/:taskId/claim'),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('taskId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], WitnessTasksController.prototype, "claimTask", null);
__decorate([
    (0, common_1.Post)('api/circles/:circleId/witness-tasks/:taskId/arrive'),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('taskId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], WitnessTasksController.prototype, "arriveAtTask", null);
__decorate([
    (0, common_1.Post)('api/circles/:circleId/witness-tasks/:taskId/submit'),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('taskId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], WitnessTasksController.prototype, "submitTask", null);
__decorate([
    (0, common_1.Post)('api/circles/:circleId/witness-tasks/:taskId/close'),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('taskId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], WitnessTasksController.prototype, "closeTask", null);
__decorate([
    (0, common_1.Post)('api/circles/:circleId/witness-tasks/:taskId/cancel'),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('taskId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], WitnessTasksController.prototype, "cancelTask", null);
__decorate([
    (0, common_1.Get)('api/me/witness-tasks'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WitnessTasksController.prototype, "listMyTasks", null);
exports.WitnessTasksController = WitnessTasksController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [witness_tasks_service_1.WitnessTasksService])
], WitnessTasksController);
//# sourceMappingURL=witness-tasks.controller.js.map