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
exports.EventsCollabController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const contracts_validator_service_1 = require("../common/contracts/contracts-validator.service");
const ng_http_error_1 = require("../common/errors/ng-http-error");
const events_collab_service_1 = require("./events-collab.service");
const circles_service_1 = require("../circles/circles.service");
let EventsCollabController = class EventsCollabController {
    constructor(svc, contracts, circles) {
        this.svc = svc;
        this.contracts = contracts;
        this.circles = circles;
    }
    async updateStatus(req, circleId, eventId, body) {
        await this.circles.mustBeMember(req.user.userId, circleId);
        const v = this.contracts.validateStatusUpdateRequest(body);
        if (!v.ok) {
            throw (0, ng_http_error_1.makeValidationError)(v.errors);
        }
        const result = await this.svc.updateStatus(circleId, eventId, body);
        const outV = this.contracts.validateStatusUpdateResponse(result);
        if (!outV.ok) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 500,
                error: 'Internal Server Error',
                code: ng_http_error_1.NgErrorCodes.INTERNAL,
                message: 'Server response does not match contracts',
                timestamp: new Date().toISOString(),
                details: { schema: 'events.status.update.response', errors: outV.errors },
                retryable: true,
            });
        }
        return result;
    }
    async createNote(req, circleId, eventId, body) {
        await this.circles.mustBeMember(req.user.userId, circleId);
        const v = this.contracts.validateNotesCreateRequest(body);
        if (!v.ok) {
            throw (0, ng_http_error_1.makeValidationError)(v.errors);
        }
        const result = await this.svc.createNote(circleId, eventId, body);
        const outV = this.contracts.validateNotesCreateResponse(result);
        if (!outV.ok) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 500,
                error: 'Internal Server Error',
                code: ng_http_error_1.NgErrorCodes.INTERNAL,
                message: 'Server response does not match contracts',
                timestamp: new Date().toISOString(),
                details: { schema: 'events.notes.create.response', errors: outV.errors },
                retryable: true,
            });
        }
        return result;
    }
};
exports.EventsCollabController = EventsCollabController;
__decorate([
    (0, common_1.Patch)(':eventId/status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Param)('eventId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], EventsCollabController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':eventId/notes'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Param)('eventId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], EventsCollabController.prototype, "createNote", null);
exports.EventsCollabController = EventsCollabController = __decorate([
    (0, common_1.Controller)('/api/circles/:circleId/events'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [events_collab_service_1.EventsCollabService,
        contracts_validator_service_1.ContractsValidatorService,
        circles_service_1.CirclesService])
], EventsCollabController);
//# sourceMappingURL=events-collab.controller.js.map