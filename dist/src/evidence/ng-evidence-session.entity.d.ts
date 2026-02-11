export type NgEvidenceSessionStatus = 'OPEN' | 'COMPLETED';
export declare class NgEvidenceSession {
    id: string;
    circleId: string;
    eventId: string;
    edgeDeviceId: string;
    status: NgEvidenceSessionStatus;
    manifestHash: string | null;
    evidenceId: string | null;
    createdAt: Date;
    completedAt: Date | null;
}
