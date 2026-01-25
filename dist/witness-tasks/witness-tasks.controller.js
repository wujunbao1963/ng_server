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
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const fs_1 = require("fs");
const crypto = require("crypto");
const witness_tasks_service_1 = require("./witness-tasks.service");
const UPLOAD_DIR = process.env.EVIDENCE_UPLOAD_DIR || './uploads/evidence';
if (!(0, fs_1.existsSync)(UPLOAD_DIR)) {
    (0, fs_1.mkdirSync)(UPLOAD_DIR, { recursive: true });
}
const evidenceStorage = (0, multer_1.diskStorage)({
    destination: (req, file, cb) => {
        const now = new Date();
        const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
        const fullPath = (0, path_1.join)(UPLOAD_DIR, datePath);
        if (!(0, fs_1.existsSync)(fullPath)) {
            (0, fs_1.mkdirSync)(fullPath, { recursive: true });
        }
        cb(null, fullPath);
    },
    filename: (req, file, cb) => {
        const taskId = req.params.taskId || 'unknown';
        const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const ext = (0, path_1.extname)(file.originalname).toLowerCase() || '.jpg';
        cb(null, `${taskId}_${uniqueSuffix}${ext}`);
    },
});
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/webm',
        'audio/aac', 'audio/mpeg', 'audio/mp4',
    ];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new common_1.BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
    }
};
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
    async riskAbortTask(circleId, taskId, dto, req) {
        const task = await this.tasksService.riskAbortTask(req.user.userId, circleId, taskId, dto);
        return { task: this.formatTask(task) };
    }
    async uploadEvidence(circleId, taskId, file, req) {
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        const evidence = await this.tasksService.addEvidence(req.user.userId, circleId, taskId, {
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
        });
        return { success: true, evidence };
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
            purpose: task.purpose,
            targetEntry: task.targetEntry,
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
            conclusion: task.conclusion,
            conclusionNote: task.conclusionNote,
            submissionNotes: task.submissionNotes,
            submissionPhotos: task.submissionPhotos,
            cancelReason: task.cancelReason,
            riskAbortReason: task.riskAbortReason,
            riskAbortedAt: task.riskAbortedAt?.toISOString?.() ?? task.riskAbortedAt,
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
    (0, common_1.Post)('api/circles/:circleId/witness-tasks/:taskId/risk-abort'),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('taskId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], WitnessTasksController.prototype, "riskAbortTask", null);
__decorate([
    (0, common_1.Post)('api/circles/:circleId/witness-tasks/:taskId/evidence'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: evidenceStorage,
        fileFilter: fileFilter,
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('taskId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], WitnessTasksController.prototype, "uploadEvidence", null);
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