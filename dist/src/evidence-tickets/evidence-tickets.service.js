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
exports.EvidenceTicketsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ng_incident_manifest_entity_1 = require("../edge-events/ng-incident-manifest.entity");
const ng_evidence_access_ticket_entity_1 = require("./ng-evidence-access-ticket.entity");
const ng_evidence_download_audit_entity_1 = require("./ng-evidence-download-audit.entity");
const ng_evidence_download_lease_entity_1 = require("./ng-evidence-download-lease.entity");
let EvidenceTicketsService = class EvidenceTicketsService {
    constructor(repo, manifests, downloads, leases) {
        this.repo = repo;
        this.manifests = manifests;
        this.downloads = downloads;
        this.leases = leases;
    }
    async acquireLease(args) {
        const ttl = Math.max(5, Math.min(args.ttlSec ?? 30, 120));
        const expiresAt = new Date(Date.now() + ttl * 1000);
        await this.leases
            .createQueryBuilder()
            .delete()
            .from(ng_evidence_download_lease_entity_1.NgEvidenceDownloadLease)
            .where('ticket_id = :ticketId', { ticketId: args.ticketId })
            .andWhere('lease_type = :leaseType', { leaseType: args.leaseType })
            .andWhere('expires_at < :now', { now: new Date() })
            .execute();
        const ins = await this.leases
            .createQueryBuilder()
            .insert()
            .into(ng_evidence_download_lease_entity_1.NgEvidenceDownloadLease)
            .values({
            ticketId: args.ticketId,
            requesterUserId: args.requesterUserId,
            leaseType: args.leaseType,
            expiresAt,
        })
            .orIgnore()
            .returning(['lease_id'])
            .execute();
        const row = ins.raw && ins.raw[0];
        return row ? row.lease_id : null;
    }
    async releaseLease(leaseId) {
        try {
            await this.leases
                .createQueryBuilder()
                .delete()
                .from(ng_evidence_download_lease_entity_1.NgEvidenceDownloadLease)
                .where('lease_id = :leaseId', { leaseId })
                .execute();
        }
        catch {
        }
    }
    async purgeExpired() {
        const now = new Date();
        const r1 = await this.repo
            .createQueryBuilder()
            .delete()
            .from(ng_evidence_access_ticket_entity_1.NgEvidenceAccessTicket)
            .where('expires_at < :now', { now })
            .execute();
        const r2 = await this.leases
            .createQueryBuilder()
            .delete()
            .from(ng_evidence_download_lease_entity_1.NgEvidenceDownloadLease)
            .where('expires_at < :now', { now })
            .execute();
        return { deletedTickets: r1.affected ?? 0, deletedLeases: r2.affected ?? 0 };
    }
    async createTicket(args) {
        const ttl = Math.max(1, Math.min(args.ttlSec, 3600));
        const expiresAt = new Date(Date.now() + ttl * 1000);
        const row = this.repo.create({
            circleId: args.circleId,
            eventId: args.eventId,
            requesterUserId: args.requesterUserId,
            evidenceKey: args.evidenceKey,
            expiresAt,
        });
        return this.repo.save(row);
    }
    async resolveTicket(args) {
        const ticket = await this.repo.findOne({ where: { ticketId: args.ticketId } });
        if (!ticket)
            return { ticket: null, manifest: null };
        const manifest = await this.manifests.findOne({ where: { circleId: ticket.circleId, eventId: ticket.eventId } });
        return { ticket, manifest };
    }
    extractEdgeUrl(args) {
        const { ticket, manifest } = args;
        if (!manifest)
            return null;
        const payload = manifest.manifestJson;
        const items = Array.isArray(payload?.manifest?.items) ? payload.manifest.items : [];
        const found = items.find((x) => x && x.evidenceKey === ticket.evidenceKey);
        return found && typeof found.edgeUrl === 'string' ? found.edgeUrl : null;
    }
    async writeDownloadAudit(args) {
        try {
            const row = this.downloads.create({
                ticketId: args.ticket.ticketId,
                circleId: args.ticket.circleId,
                eventId: args.ticket.eventId,
                requesterUserId: args.requesterUserId,
                evidenceKey: args.ticket.evidenceKey,
                requestedRange: args.requestedRange,
                upstreamStatus: args.upstreamStatus,
                bytesSent: args.bytesSent !== null ? String(args.bytesSent) : null,
            });
            await this.downloads.save(row);
        }
        catch {
        }
    }
};
exports.EvidenceTicketsService = EvidenceTicketsService;
exports.EvidenceTicketsService = EvidenceTicketsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_evidence_access_ticket_entity_1.NgEvidenceAccessTicket)),
    __param(1, (0, typeorm_1.InjectRepository)(ng_incident_manifest_entity_1.NgIncidentManifest)),
    __param(2, (0, typeorm_1.InjectRepository)(ng_evidence_download_audit_entity_1.NgEvidenceDownloadAudit)),
    __param(3, (0, typeorm_1.InjectRepository)(ng_evidence_download_lease_entity_1.NgEvidenceDownloadLease)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], EvidenceTicketsService);
//# sourceMappingURL=evidence-tickets.service.js.map