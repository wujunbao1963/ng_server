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
exports.TopoMapController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const device_key_auth_guard_1 = require("../device-auth/device-key-auth.guard");
const ng_device_decorator_1 = require("../device-auth/ng-device.decorator");
const contracts_validator_service_1 = require("../common/contracts/contracts-validator.service");
const ng_http_error_1 = require("../common/errors/ng-http-error");
const topomap_service_1 = require("./topomap.service");
let TopoMapController = class TopoMapController {
    constructor(topo, contracts) {
        this.topo = topo;
        this.contracts = contracts;
    }
    async putTopoMap(circleId, _device, body) {
        const vr = this.contracts.validateTopoMapRequest(body);
        if (!vr.ok)
            throw (0, ng_http_error_1.makeValidationError)(vr.errors);
        const b = body;
        await this.topo.upsert(circleId, { version: b.version, data: b.data });
        return { ok: true };
    }
    async getTopoMap(circleId) {
        const found = await this.topo.get(circleId);
        if (!found)
            throw (0, ng_http_error_1.makeNotFoundError)('TopoMap not found');
        const out = {
            version: found.version,
            data: found.data,
        };
        const vo = this.contracts.validateTopoMapResponse(out);
        if (!vo.ok)
            throw (0, ng_http_error_1.makeValidationError)(vo.errors);
        return out;
    }
};
exports.TopoMapController = TopoMapController;
__decorate([
    (0, common_1.Put)(),
    (0, common_1.UseGuards)(device_key_auth_guard_1.DeviceKeyAuthGuard),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, ng_device_decorator_1.NgDevice)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], TopoMapController.prototype, "putTopoMap", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TopoMapController.prototype, "getTopoMap", null);
exports.TopoMapController = TopoMapController = __decorate([
    (0, common_1.Controller)('api/circles/:circleId/topomap'),
    __metadata("design:paramtypes", [topomap_service_1.TopoMapService,
        contracts_validator_service_1.ContractsValidatorService])
], TopoMapController);
//# sourceMappingURL=topomap.controller.js.map