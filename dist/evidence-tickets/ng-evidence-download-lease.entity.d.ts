export type EvidenceLeaseType = 'download' | 'meta';
export declare class NgEvidenceDownloadLease {
    leaseId: string;
    ticketId: string;
    requesterUserId: string;
    leaseType: EvidenceLeaseType;
    expiresAt: Date;
    createdAt: Date;
}
