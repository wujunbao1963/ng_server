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
exports.EvidenceTicketsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const contracts_validator_service_1 = require("../common/contracts/contracts-validator.service");
const ng_http_error_1 = require("../common/errors/ng-http-error");
const circles_service_1 = require("../circles/circles.service");
const evidence_tickets_service_1 = require("./evidence-tickets.service");
let EvidenceTicketsController = class EvidenceTicketsController {
    constructor(svc, circles, contracts) {
        this.svc = svc;
        this.circles = circles;
        this.contracts = contracts;
    }
    async createTicket(req, circleId, eventId, body) {
        await this.circles.mustBeMember(req.user.userId, circleId);
        const v = this.contracts.validateAppEvidenceTicketCreateRequest(body);
        if (!v.ok) {
            throw (0, ng_http_error_1.makeValidationError)(v.errors);
        }
        const typed = body;
        const row = await this.svc.createTicket({
            circleId,
            eventId,
            requesterUserId: req.user.userId,
            evidenceKey: typed.evidenceKey,
            ttlSec: typed.ttlSec,
        });
        const response = {
            ok: true,
            ticketId: row.ticketId,
            evidenceKey: row.evidenceKey,
            expiresAt: row.expiresAt.toISOString(),
            accessMode: 'TICKET_ONLY',
        };
        const vr = this.contracts.validateAppEvidenceTicketCreateResponse(response);
        if (!vr.ok) {
            throw (0, ng_http_error_1.makeValidationError)(vr.errors);
        }
        return response;
    }
};
exports.EvidenceTicketsController = EvidenceTicketsController;
__decorate([
    (0, common_1.Post)('tickets'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Param)('eventId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], EvidenceTicketsController.prototype, "createTicket", null);
exports.EvidenceTicketsController = EvidenceTicketsController = __decorate([
    (0, common_1.Controller)('/api/circles/:circleId/events/:eventId/evidence'),
    __metadata("design:paramtypes", [evidence_tickets_service_1.EvidenceTicketsService,
        circles_service_1.CirclesService,
        contracts_validator_service_1.ContractsValidatorService])
], EvidenceTicketsController);
//# sourceMappingURL=evidence-tickets.controller.js.map