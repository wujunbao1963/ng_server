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
var EdgeCommandsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdgeCommandsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ng_edge_command_entity_1 = require("./ng-edge-command.entity");
let EdgeCommandsService = EdgeCommandsService_1 = class EdgeCommandsService {
    constructor(commandRepo) {
        this.commandRepo = commandRepo;
        this.logger = new common_1.Logger(EdgeCommandsService_1.name);
    }
    async createCommand(dto) {
        const expiresInSeconds = dto.expiresInSeconds ?? 300;
        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
        const command = this.commandRepo.create({
            circleId: dto.circleId,
            edgeInstanceId: dto.edgeInstanceId,
            commandType: dto.commandType,
            commandPayload: dto.commandPayload ?? null,
            triggeredByUserId: dto.triggeredByUserId ?? null,
            eventId: dto.eventId ?? null,
            status: 'pending',
            expiresAt,
        });
        const saved = await this.commandRepo.save(command);
        this.logger.log(`Created command: ${saved.id} type=${dto.commandType} edge=${dto.edgeInstanceId}`);
        return saved;
    }
    async getPendingCommands(circleId, edgeInstanceId, limit = 10) {
        const now = new Date();
        await this.commandRepo.update({
            circleId,
            edgeInstanceId,
            status: 'pending',
            expiresAt: (0, typeorm_2.LessThan)(now),
        }, { status: 'expired' });
        const commands = await this.commandRepo.find({
            where: {
                circleId,
                edgeInstanceId,
                status: 'pending',
            },
            order: { createdAt: 'ASC' },
            take: limit,
        });
        return commands.map((cmd) => ({
            commandId: cmd.id,
            commandType: cmd.commandType,
            commandPayload: cmd.commandPayload,
            eventId: cmd.eventId,
            createdAt: cmd.createdAt.toISOString(),
            expiresAt: cmd.expiresAt.toISOString(),
        }));
    }
    async acknowledgeCommand(commandId, edgeInstanceId) {
        const command = await this.commandRepo.findOne({
            where: { id: commandId, edgeInstanceId },
        });
        if (!command) {
            return { success: false, message: 'Command not found' };
        }
        if (command.status !== 'pending') {
            return { success: false, message: `Command already ${command.status}` };
        }
        if (command.expiresAt < new Date()) {
            await this.commandRepo.update(commandId, { status: 'expired' });
            return { success: false, message: 'Command expired' };
        }
        await this.commandRepo.update(commandId, {
            status: 'delivered',
            deliveredAt: new Date(),
        });
        this.logger.log(`Command acknowledged: ${commandId}`);
        return { success: true, message: 'Acknowledged' };
    }
    async completeCommand(commandId, edgeInstanceId, result) {
        const command = await this.commandRepo.findOne({
            where: { id: commandId, edgeInstanceId },
        });
        if (!command) {
            return { success: false, message: 'Command not found' };
        }
        if (!['pending', 'delivered'].includes(command.status)) {
            return { success: false, message: `Command already ${command.status}` };
        }
        const newStatus = result.success ? 'executed' : 'failed';
        await this.commandRepo.update(commandId, {
            status: newStatus,
            executedAt: new Date(),
            resultMessage: result.message ?? null,
        });
        this.logger.log(`Command completed: ${commandId} status=${newStatus} message=${result.message}`);
        return { success: true, message: 'Recorded' };
    }
    async getCommandsByEventId(circleId, eventId) {
        return this.commandRepo.find({
            where: { circleId, eventId },
            order: { createdAt: 'DESC' },
        });
    }
    async cleanupExpiredCommands(olderThanDays = 7) {
        const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
        const result = await this.commandRepo.delete({
            status: (0, typeorm_2.In)(['expired', 'executed', 'failed']),
            createdAt: (0, typeorm_2.LessThan)(cutoff),
        });
        return result.affected ?? 0;
    }
};
exports.EdgeCommandsService = EdgeCommandsService;
exports.EdgeCommandsService = EdgeCommandsService = EdgeCommandsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_edge_command_entity_1.NgEdgeCommand)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], EdgeCommandsService);
//# sourceMappingURL=edge-commands.service.js.map