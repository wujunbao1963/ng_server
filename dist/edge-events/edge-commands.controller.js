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
exports.EdgeCommandsController = void 0;
const common_1 = require("@nestjs/common");
const device_key_auth_guard_1 = require("../device-auth/device-key-auth.guard");
const edge_commands_service_1 = require("./edge-commands.service");
let EdgeCommandsController = class EdgeCommandsController {
    constructor(commandsService) {
        this.commandsService = commandsService;
    }
    async getPendingCommands(circleId, edgeInstanceId, limitStr) {
        if (!edgeInstanceId) {
            return {
                error: 'Missing edgeInstanceId query parameter',
                commands: [],
            };
        }
        const limit = limitStr ? Math.min(parseInt(limitStr, 10) || 10, 50) : 10;
        const commands = await this.commandsService.getPendingCommands(circleId, edgeInstanceId, limit);
        return { commands };
    }
    async acknowledgeCommand(circleId, commandId, body) {
        if (!body.edgeInstanceId) {
            return {
                success: false,
                message: 'Missing edgeInstanceId in body',
            };
        }
        return this.commandsService.acknowledgeCommand(commandId, body.edgeInstanceId);
    }
    async completeCommand(circleId, commandId, body) {
        if (!body.edgeInstanceId) {
            return {
                success: false,
                message: 'Missing edgeInstanceId in body',
            };
        }
        return this.commandsService.completeCommand(commandId, body.edgeInstanceId, {
            success: body.success,
            message: body.message,
        });
    }
};
exports.EdgeCommandsController = EdgeCommandsController;
__decorate([
    (0, common_1.Get)('pending'),
    (0, common_1.UseGuards)(device_key_auth_guard_1.DeviceKeyAuthGuard),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Query)('edgeInstanceId')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], EdgeCommandsController.prototype, "getPendingCommands", null);
__decorate([
    (0, common_1.Post)(':commandId/ack'),
    (0, common_1.UseGuards)(device_key_auth_guard_1.DeviceKeyAuthGuard),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('commandId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EdgeCommandsController.prototype, "acknowledgeCommand", null);
__decorate([
    (0, common_1.Post)(':commandId/complete'),
    (0, common_1.UseGuards)(device_key_auth_guard_1.DeviceKeyAuthGuard),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('commandId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EdgeCommandsController.prototype, "completeCommand", null);
exports.EdgeCommandsController = EdgeCommandsController = __decorate([
    (0, common_1.Controller)('/api/circles/:circleId/edge/commands'),
    __metadata("design:paramtypes", [edge_commands_service_1.EdgeCommandsService])
], EdgeCommandsController);
//# sourceMappingURL=edge-commands.controller.js.map