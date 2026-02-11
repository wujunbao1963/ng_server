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
exports.EvidenceTicketResolveController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const contracts_validator_service_1 = require("../common/contracts/contracts-validator.service");
const ng_http_error_1 = require("../common/errors/ng-http-error");
const circles_service_1 = require("../circles/circles.service");
const evidence_tickets_service_1 = require("./evidence-tickets.service");
let EvidenceTicketResolveController = class EvidenceTicketResolveController {
    constructor(svc, circles, contracts) {
        this.svc = svc;
        this.circles = circles;
        this.contracts = contracts;
    }
    async resolve(req, ticketId) {
        const { ticket, manifest } = await this.svc.resolveTicket({ ticketId });
        if (!ticket) {
            throw new common_1.NotFoundException();
        }
        await this.circles.mustBeMember(req.user.userId, ticket.circleId);
        if (ticket.requesterUserId !== req.user.userId) {
            throw new common_1.ForbiddenException('ticket not owned');
        }
        const now = Date.now();
        if (ticket.expiresAt.getTime() <= now) {
            throw new common_1.ForbiddenException('ticket expired');
        }
        let mode = 'NOT_AVAILABLE';
        let url;
        if (manifest) {
            const payload = manifest.manifestJson;
            const items = Array.isArray(payload?.manifest?.items) ? payload.manifest.items : [];
            const found = items.find((x) => x && x.evidenceKey === ticket.evidenceKey);
            if (found && typeof found.edgeUrl === 'string') {
                mode = 'EDGE_DIRECT_URL';
                url = found.edgeUrl;
            }
        }
        const response = {
            ok: true,
            ticketId: ticket.ticketId,
            evidenceKey: ticket.evidenceKey,
            mode,
        };
        if (url) {
            response.url = url;
        }
        const vr = this.contracts.validateAppEvidenceTicketResolveResponse(response);
        if (!vr.ok) {
            throw (0, ng_http_error_1.makeValidationError)(vr.errors);
        }
        return response;
    }
};
exports.EvidenceTicketResolveController = EvidenceTicketResolveController;
__decorate([
    (0, common_1.Get)(':ticketId/resolve'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('ticketId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], EvidenceTicketResolveController.prototype, "resolve", null);
exports.EvidenceTicketResolveController = EvidenceTicketResolveController = __decorate([
    (0, common_1.Controller)('/api/evidence/tickets'),
    __metadata("design:paramtypes", [evidence_tickets_service_1.EvidenceTicketsService,
        circles_service_1.CirclesService,
        contracts_validator_service_1.ContractsValidatorService])
], EvidenceTicketResolveController);
//# sourceMappingURL=evidence-ticket-resolve.controller.js.map