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
exports.EvidenceController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const device_key_auth_guard_1 = require("../device-auth/device-key-auth.guard");
const ng_device_decorator_1 = require("../device-auth/ng-device.decorator");
const ng_edge_device_entity_1 = require("../edge-devices/ng-edge-device.entity");
const contracts_validator_service_1 = require("../common/contracts/contracts-validator.service");
const ng_http_error_1 = require("../common/errors/ng-http-error");
const evidence_service_1 = require("./evidence.service");
const circles_service_1 = require("../circles/circles.service");
const usecases_1 = require("../application/usecases");
const request_id_interceptor_1 = require("../infra/interceptors/request-id.interceptor");
let EvidenceController = class EvidenceController {
    constructor(contracts, svc, circles, completeEvidenceUseCase) {
        this.contracts = contracts;
        this.svc = svc;
        this.circles = circles;
        this.completeEvidenceUseCase = completeEvidenceUseCase;
    }
    async createUploadSession(circleId, eventId, device, body) {
        const vr = this.contracts.validateEvidenceUploadSessionRequest(body);
        if (!vr.ok)
            throw (0, ng_http_error_1.makeValidationError)(vr.errors);
        const resp = await this.svc.createUploadSession(device, circleId, eventId, body);
        const out = this.contracts.validateEvidenceUploadSessionResponse(resp);
        if (!out.ok)
            throw (0, ng_http_error_1.makeValidationError)(out.errors);
        return resp;
    }
    async complete(req, circleId, eventId, device, body) {
        const vr = this.contracts.validateEvidenceCompleteRequest(body);
        if (!vr.ok)
            throw (0, ng_http_error_1.makeValidationError)(vr.errors);
        const typed = body;
        const resp = await this.completeEvidenceUseCase.execute({
            device,
            circleId,
            eventId,
            sessionId: typed.sessionId,
            manifest: typed.manifest,
            reportPackage: typed.reportPackage,
            requestId: (0, request_id_interceptor_1.getRequestId)(req),
        });
        const out = this.contracts.validateEvidenceCompleteResponse(resp);
        if (!out.ok)
            throw (0, ng_http_error_1.makeValidationError)(out.errors);
        return resp;
    }
    async getEvidence(req, circleId, eventId) {
        await this.circles.mustBeMember(req.user.userId, circleId);
        const resp = await this.svc.getEvidence(circleId, eventId);
        const out = this.contracts.validateEvidenceGetResponse(resp);
        if (!out.ok)
            throw (0, ng_http_error_1.makeValidationError)(out.errors);
        return resp;
    }
    async downloadUrl(req, circleId, eventId, sha256) {
        await this.circles.mustBeMember(req.user.userId, circleId);
        const resp = await this.svc.getDownloadUrl(circleId, eventId, sha256);
        const out = this.contracts.validateEvidenceDownloadUrlResponse(resp);
        if (!out.ok)
            throw (0, ng_http_error_1.makeValidationError)(out.errors);
        return resp;
    }
};
exports.EvidenceController = EvidenceController;
__decorate([
    (0, common_1.Post)('upload-session'),
    (0, common_1.UseGuards)(device_key_auth_guard_1.DeviceKeyAuthGuard),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('eventId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, ng_device_decorator_1.NgDevice)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, ng_edge_device_entity_1.NgEdgeDevice, Object]),
    __metadata("design:returntype", Promise)
], EvidenceController.prototype, "createUploadSession", null);
__decorate([
    (0, common_1.Post)('complete'),
    (0, common_1.UseGuards)(device_key_auth_guard_1.DeviceKeyAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Param)('eventId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(3, (0, ng_device_decorator_1.NgDevice)()),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, ng_edge_device_entity_1.NgEdgeDevice, Object]),
    __metadata("design:returntype", Promise)
], EvidenceController.prototype, "complete", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Param)('eventId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], EvidenceController.prototype, "getEvidence", null);
__decorate([
    (0, common_1.Post)('items/:sha256/download-url'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Param)('eventId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(3, (0, common_1.Param)('sha256')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], EvidenceController.prototype, "downloadUrl", null);
exports.EvidenceController = EvidenceController = __decorate([
    (0, common_1.Controller)('/api/circles/:circleId/events/:eventId/evidence'),
    __metadata("design:paramtypes", [contracts_validator_service_1.ContractsValidatorService,
        evidence_service_1.EvidenceService,
        circles_service_1.CirclesService,
        usecases_1.CompleteEvidenceUseCase])
], EvidenceController);
//# sourceMappingURL=evidence.controller.js.map