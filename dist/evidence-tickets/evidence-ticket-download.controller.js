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
exports.EvidenceTicketDownloadController = void 0;
const common_1 = require("@nestjs/common");
const stream_1 = require("stream");
const evidence_tickets_service_1 = require("./evidence-tickets.service");
let EvidenceTicketDownloadController = class EvidenceTicketDownloadController {
    constructor(svc) {
        this.svc = svc;
    }
    async download(ticketId, req, res) {
        const { ticket, manifest } = await this.svc.resolveTicket({ ticketId });
        if (!ticket)
            throw new common_1.NotFoundException('ticket not found');
        const now = Date.now();
        if (ticket.expiresAt.getTime() <= now) {
            throw new common_1.ForbiddenException('ticket expired');
        }
        if (!manifest) {
            throw new common_1.NotFoundException('incident manifest not found');
        }
        const edgeUrl = this.svc.extractEdgeUrl({ ticket, manifest });
        if (!edgeUrl) {
            throw new common_1.NotFoundException('evidence not available');
        }
        const range = req.headers?.['range'] || undefined;
        const ac = new AbortController();
        const timeout = setTimeout(() => ac.abort(), 15000);
        let upstream;
        try {
            upstream = await fetch(edgeUrl, {
                signal: ac.signal,
                headers: range ? { Range: range } : undefined,
            });
        }
        catch (e) {
            await this.svc.writeDownloadAudit({
                ticket,
                requesterUserId: ticket.requesterUserId,
                requestedRange: range || null,
                upstreamStatus: 0,
                bytesSent: null,
            });
            throw new common_1.BadGatewayException('failed to fetch evidence');
        }
        finally {
            clearTimeout(timeout);
        }
        if (!upstream.body) {
            await this.svc.writeDownloadAudit({
                ticket,
                requesterUserId: ticket.requesterUserId,
                requestedRange: range || null,
                upstreamStatus: upstream.status,
                bytesSent: null,
            });
            throw new common_1.BadGatewayException(`upstream responded ${upstream.status}`);
        }
        if (!(upstream.status === 200 || upstream.status === 206)) {
            await this.svc.writeDownloadAudit({
                ticket,
                requesterUserId: ticket.requesterUserId,
                requestedRange: range || null,
                upstreamStatus: upstream.status,
                bytesSent: null,
            });
            throw new common_1.HttpException(`upstream responded ${upstream.status}`, upstream.status);
        }
        res.status(upstream.status);
        const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        const len = upstream.headers.get('content-length');
        if (len)
            res.setHeader('Content-Length', len);
        const acceptRanges = upstream.headers.get('accept-ranges');
        if (acceptRanges)
            res.setHeader('Accept-Ranges', acceptRanges);
        const contentRange = upstream.headers.get('content-range');
        if (contentRange)
            res.setHeader('Content-Range', contentRange);
        try {
            await this.svc.writeDownloadAudit({
                ticket,
                requesterUserId: ticket.requesterUserId,
                requestedRange: range || null,
                upstreamStatus: upstream.status,
                bytesSent: len ? Number(len) : null,
            });
        }
        catch {
        }
        const nodeReadable = stream_1.Readable.fromWeb(upstream.body);
        nodeReadable.pipe(res);
    }
};
exports.EvidenceTicketDownloadController = EvidenceTicketDownloadController;
__decorate([
    (0, common_1.Get)(':ticketId/download'),
    __param(0, (0, common_1.Param)('ticketId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], EvidenceTicketDownloadController.prototype, "download", null);
exports.EvidenceTicketDownloadController = EvidenceTicketDownloadController = __decorate([
    (0, common_1.Controller)('/api/evidence/tickets'),
    __metadata("design:paramtypes", [evidence_tickets_service_1.EvidenceTicketsService])
], EvidenceTicketDownloadController);
//# sourceMappingURL=evidence-ticket-download.controller.js.map