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
exports.EdgeEventsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const contracts_validator_service_1 = require("../common/contracts/contracts-validator.service");
const ng_http_error_1 = require("../common/errors/ng-http-error");
const device_key_auth_guard_1 = require("../device-auth/device-key-auth.guard");
const edge_events_service_1 = require("./edge-events.service");
const incident_manifests_service_1 = require("./incident-manifests.service");
const circles_service_1 = require("../circles/circles.service");
let EdgeEventsController = class EdgeEventsController {
    constructor(contracts, svc, manifests, circles) {
        this.contracts = contracts;
        this.svc = svc;
        this.manifests = manifests;
        this.circles = circles;
    }
    async listEvents(req, circleId, limitStr) {
        await this.circles.mustBeMember(req.user.userId, circleId);
        const limit = limitStr ? Math.min(parseInt(limitStr, 10) || 50, 100) : 50;
        return this.svc.listEvents(circleId, limit);
    }
    async getEvent(req, circleId, eventId) {
        await this.circles.mustBeMember(req.user.userId, circleId);
        const event = await this.svc.getEvent(circleId, eventId);
        if (!event) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: 'NOT_FOUND',
                message: 'Event not found',
                timestamp: new Date().toISOString(),
                details: { circleId, eventId },
                retryable: false,
            });
        }
        return event;
    }
    async updateStatus(req, circleId, eventId, body) {
        await this.circles.mustBeMember(req.user.userId, circleId);
        if (!['OPEN', 'ACKED', 'RESOLVED'].includes(body.status)) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 400,
                error: 'Bad Request',
                code: 'INVALID_STATUS',
                message: 'Status must be OPEN, ACKED, or RESOLVED',
                timestamp: new Date().toISOString(),
                details: { status: body.status },
                retryable: false,
            });
        }
        const result = await this.svc.updateEventStatus(circleId, eventId, body.status, body.note);
        if (!result) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: 'NOT_FOUND',
                message: 'Event not found',
                timestamp: new Date().toISOString(),
                details: { circleId, eventId },
                retryable: false,
            });
        }
        return result;
    }
    async summaryUpsert(circleId, body) {
        const validation = this.contracts.validateEdgeEventSummaryUpsertRequest(body);
        if (!validation.ok) {
            throw (0, ng_http_error_1.makeValidationError)(validation.errors);
        }
        const typed = body;
        if (typed.circleId !== circleId) {
            throw (0, ng_http_error_1.makeValidationError)([
                {
                    instancePath: '/circleId',
                    schemaPath: 'path.circleId',
                    keyword: 'const',
                    params: { allowedValue: circleId },
                    message: 'circleId must match URL path parameter',
                },
            ]);
        }
        const upsert = await this.svc.storeSummaryUpsert(typed);
        return {
            ok: true,
            applied: upsert.applied,
            reason: upsert.reason,
            serverReceivedAt: new Date().toISOString(),
        };
    }
    async manifestUpsert(circleId, eventId, body) {
        const validation = this.contracts.validateEdgeIncidentManifestUpsertRequest(body);
        if (!validation.ok) {
            throw (0, ng_http_error_1.makeValidationError)(validation.errors);
        }
        const typed = body;
        if (typed.circleId !== circleId) {
            throw (0, ng_http_error_1.makeValidationError)([
                {
                    instancePath: '/circleId',
                    schemaPath: 'path.circleId',
                    keyword: 'const',
                    params: { allowedValue: circleId },
                    message: 'circleId must match URL path parameter',
                },
            ]);
        }
        if (typed.eventId !== eventId) {
            throw (0, ng_http_error_1.makeValidationError)([
                {
                    instancePath: '/eventId',
                    schemaPath: 'path.eventId',
                    keyword: 'const',
                    params: { allowedValue: eventId },
                    message: 'eventId must match URL path parameter',
                },
            ]);
        }
        const upsert = await this.manifests.storeManifestUpsert(typed);
        return {
            ok: true,
            applied: upsert.applied,
            reason: upsert.reason,
            serverReceivedAt: new Date().toISOString(),
        };
    }
};
exports.EdgeEventsController = EdgeEventsController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], EdgeEventsController.prototype, "listEvents", null);
__decorate([
    (0, common_1.Get)(':eventId'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Param)('eventId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], EdgeEventsController.prototype, "getEvent", null);
__decorate([
    (0, common_1.Patch)(':eventId/status'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Param)('eventId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], EdgeEventsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)('summary-upsert'),
    (0, common_1.UseGuards)(device_key_auth_guard_1.DeviceKeyAuthGuard),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EdgeEventsController.prototype, "summaryUpsert", null);
__decorate([
    (0, common_1.Post)(':eventId/incident/manifest-upsert'),
    (0, common_1.UseGuards)(device_key_auth_guard_1.DeviceKeyAuthGuard),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('eventId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EdgeEventsController.prototype, "manifestUpsert", null);
exports.EdgeEventsController = EdgeEventsController = __decorate([
    (0, common_1.Controller)('/api/circles/:circleId/edge/events'),
    __metadata("design:paramtypes", [contracts_validator_service_1.ContractsValidatorService,
        edge_events_service_1.EdgeEventsService,
        incident_manifests_service_1.IncidentManifestsService,
        circles_service_1.CirclesService])
], EdgeEventsController);
//# sourceMappingURL=edge-events.controller.js.map