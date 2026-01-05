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
exports.EvidenceTicketMetaController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const circles_service_1 = require("../circles/circles.service");
const evidence_tickets_service_1 = require("./evidence-tickets.service");
const contracts_validator_service_1 = require("../common/contracts/contracts-validator.service");
const ng_http_error_1 = require("../common/errors/ng-http-error");
let EvidenceTicketMetaController = class EvidenceTicketMetaController {
    constructor(svc, circles, contracts) {
        this.svc = svc;
        this.circles = circles;
        this.contracts = contracts;
    }
    async meta(req, ticketId) {
        const { ticket, manifest } = await this.svc.resolveTicket({ ticketId });
        if (!ticket)
            throw new common_1.NotFoundException();
        await this.circles.mustBeMember(req.user.userId, ticket.circleId);
        if (ticket.requesterUserId !== req.user.userId) {
            throw new common_1.ForbiddenException('ticket not owned');
        }
        const now = Date.now();
        if (ticket.expiresAt.getTime() <= now) {
            throw new common_1.ForbiddenException('ticket expired');
        }
        const edgeUrl = this.svc.extractEdgeUrl({ ticket, manifest });
        if (!edgeUrl) {
            throw new common_1.NotFoundException('evidence not available');
        }
        const leaseId = await this.svc.acquireLease({
            ticketId: ticket.ticketId,
            requesterUserId: req.user.userId,
            leaseType: 'meta',
            ttlSec: 20,
        });
        if (!leaseId) {
            throw new common_1.HttpException('too many concurrent requests', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const safeRelease = async () => {
            try {
                await this.svc.releaseLease(leaseId);
            }
            catch {
            }
        };
        const ac = new AbortController();
        const timeout = setTimeout(() => ac.abort(), 8000);
        let upstream;
        try {
            upstream = await fetch(edgeUrl, { method: 'HEAD', signal: ac.signal });
        }
        catch (e) {
            await safeRelease();
            throw new common_1.BadGatewayException('failed to fetch evidence metadata');
        }
        finally {
            clearTimeout(timeout);
        }
        if (upstream.status >= 400) {
            await this.svc.writeDownloadAudit({
                ticket,
                requesterUserId: req.user.userId,
                requestedRange: null,
                upstreamStatus: upstream.status,
                bytesSent: null,
            });
            await safeRelease();
            throw new common_1.BadGatewayException(`upstream responded ${upstream.status}`);
        }
        const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
        const len = upstream.headers.get('content-length');
        const acceptRanges = upstream.headers.get('accept-ranges');
        const body = {
            ok: true,
            ticketId: ticket.ticketId,
            evidenceKey: ticket.evidenceKey,
            contentType,
            contentLength: len ? Number(len) : null,
            acceptRanges: acceptRanges || null,
        };
        const v = this.contracts.validateAppEvidenceTicketMetaResponse(body);
        if (!v.ok) {
            throw (0, ng_http_error_1.makeValidationError)(v.errors);
        }
        await this.svc.writeDownloadAudit({
            ticket,
            requesterUserId: req.user.userId,
            requestedRange: null,
            upstreamStatus: upstream.status,
            bytesSent: len ? Number(len) : null,
        });
        await safeRelease();
        return body;
    }
};
exports.EvidenceTicketMetaController = EvidenceTicketMetaController;
__decorate([
    (0, common_1.Get)(':ticketId/meta'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('ticketId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], EvidenceTicketMetaController.prototype, "meta", null);
exports.EvidenceTicketMetaController = EvidenceTicketMetaController = __decorate([
    (0, common_1.Controller)('/api/evidence/tickets'),
    __metadata("design:paramtypes", [evidence_tickets_service_1.EvidenceTicketsService,
        circles_service_1.CirclesService,
        contracts_validator_service_1.ContractsValidatorService])
], EvidenceTicketMetaController);
//# sourceMappingURL=evidence-ticket-meta.controller.js.map