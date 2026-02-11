import { Repository } from 'typeorm';
import { NgIncidentManifest } from '../edge-events/ng-incident-manifest.entity';
import { NgEvidenceAccessTicket } from './ng-evidence-access-ticket.entity';
import { NgEvidenceDownloadAudit } from './ng-evidence-download-audit.entity';
import { EvidenceLeaseType, NgEvidenceDownloadLease } from './ng-evidence-download-lease.entity';
export declare class EvidenceTicketsService {
    private readonly repo;
    private readonly manifests;
    private readonly downloads;
    private readonly leases;
    constructor(repo: Repository<NgEvidenceAccessTicket>, manifests: Repository<NgIncidentManifest>, downloads: Repository<NgEvidenceDownloadAudit>, leases: Repository<NgEvidenceDownloadLease>);
    acquireLease(args: {
        ticketId: string;
        requesterUserId: string;
        leaseType: EvidenceLeaseType;
        ttlSec?: number;
    }): Promise<string | null>;
    releaseLease(leaseId: string): Promise<void>;
    purgeExpired(): Promise<{
        deletedTickets: number;
        deletedLeases: number;
    }>;
    createTicket(args: {
        circleId: string;
        eventId: string;
        requesterUserId: string;
        evidenceKey: string;
        ttlSec: number;
    }): Promise<NgEvidenceAccessTicket>;
    resolveTicket(args: {
        ticketId: string;
    }): Promise<{
        ticket: NgEvidenceAccessTicket | null;
        manifest: NgIncidentManifest | null;
    }>;
    extractEdgeUrl(args: {
        ticket: NgEvidenceAccessTicket;
        manifest: NgIncidentManifest | null;
    }): string | null;
    writeDownloadAudit(args: {
        ticket: NgEvidenceAccessTicket;
        requesterUserId: string;
        requestedRange: string | null;
        upstreamStatus: number;
        bytesSent: number | null;
    }): Promise<void>;
}
