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
exports.EventsIngestController = void 0;
const common_1 = require("@nestjs/common");
const device_key_auth_guard_1 = require("../device-auth/device-key-auth.guard");
const ng_device_decorator_1 = require("../device-auth/ng-device.decorator");
const ng_edge_device_entity_1 = require("../edge-devices/ng-edge-device.entity");
const contracts_validator_service_1 = require("../common/contracts/contracts-validator.service");
const ng_http_error_1 = require("../common/errors/ng-http-error");
const events_ingest_service_1 = require("./events-ingest.service");
let EventsIngestController = class EventsIngestController {
    constructor(contracts, svc) {
        this.contracts = contracts;
        this.svc = svc;
    }
    async ingest(circleId, device, body) {
        const result = this.contracts.validateEventsIngestRequest(body);
        if (!result.ok) {
            throw (0, ng_http_error_1.makeValidationError)(result.errors);
        }
        const typed = body;
        return this.svc.ingest(device, circleId, typed);
    }
};
exports.EventsIngestController = EventsIngestController;
__decorate([
    (0, common_1.Post)('ingest'),
    (0, common_1.UseGuards)(device_key_auth_guard_1.DeviceKeyAuthGuard),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, ng_device_decorator_1.NgDevice)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ng_edge_device_entity_1.NgEdgeDevice, Object]),
    __metadata("design:returntype", Promise)
], EventsIngestController.prototype, "ingest", null);
exports.EventsIngestController = EventsIngestController = __decorate([
    (0, common_1.Controller)('/api/circles/:circleId/events'),
    __metadata("design:paramtypes", [contracts_validator_service_1.ContractsValidatorService,
        events_ingest_service_1.EventsIngestService])
], EventsIngestController);
//# sourceMappingURL=events-ingest.controller.js.map