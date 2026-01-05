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
exports.EdgeDevicesController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const edge_devices_service_1 = require("./edge-devices.service");
const register_edge_device_dto_1 = require("./dto/register-edge-device.dto");
const update_edge_device_dto_1 = require("./dto/update-edge-device.dto");
const contracts_validator_service_1 = require("../common/contracts/contracts-validator.service");
const ng_http_error_1 = require("../common/errors/ng-http-error");
let EdgeDevicesController = class EdgeDevicesController {
    constructor(edgeDevices, contracts) {
        this.edgeDevices = edgeDevices;
        this.contracts = contracts;
    }
    async register(circleId, body, req) {
        const vr = this.contracts.validateDeviceRegisterRequest(body);
        if (!vr.ok)
            throw (0, ng_http_error_1.makeValidationError)(vr.errors);
        const out = await this.edgeDevices.register(req.user.userId, circleId, body);
        const vo = this.contracts.validateDeviceRegisterResponse(out);
        if (!vo.ok)
            throw (0, ng_http_error_1.makeValidationError)(vo.errors);
        return out;
    }
    async list(circleId, req) {
        return this.edgeDevices.list(req.user.userId, circleId);
    }
    async setEnabled(circleId, deviceId, body, req) {
        try {
            return await this.edgeDevices.setEnabled(req.user.userId, circleId, deviceId, body.enabled);
        }
        catch (e) {
            if (e?.message === 'DEVICE_NOT_FOUND')
                throw (0, ng_http_error_1.makeNotFoundError)('Device not found');
            throw e;
        }
    }
    async rotateKey(circleId, deviceId, req) {
        try {
            return await this.edgeDevices.rotateKey(req.user.userId, circleId, deviceId);
        }
        catch (e) {
            if (e?.message === 'DEVICE_NOT_FOUND')
                throw (0, ng_http_error_1.makeNotFoundError)('Device not found');
            throw e;
        }
    }
};
exports.EdgeDevicesController = EdgeDevicesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, register_edge_device_dto_1.RegisterEdgeDeviceDto, Object]),
    __metadata("design:returntype", Promise)
], EdgeDevicesController.prototype, "register", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EdgeDevicesController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(':deviceId'),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('deviceId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_edge_device_dto_1.UpdateEdgeDeviceDto, Object]),
    __metadata("design:returntype", Promise)
], EdgeDevicesController.prototype, "setEnabled", null);
__decorate([
    (0, common_1.Post)(':deviceId/rotate-key'),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('deviceId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EdgeDevicesController.prototype, "rotateKey", null);
exports.EdgeDevicesController = EdgeDevicesController = __decorate([
    (0, common_1.Controller)('api/circles/:circleId/edge/devices'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [edge_devices_service_1.EdgeDevicesService,
        contracts_validator_service_1.ContractsValidatorService])
], EdgeDevicesController);
//# sourceMappingURL=edge-devices.controller.js.map