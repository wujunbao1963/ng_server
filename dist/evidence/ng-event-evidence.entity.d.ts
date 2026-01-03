export declare class NgEventEvidence {
    id: string;
    circleId: string;
    eventId: string;
    sessionId: string;
    evidenceStatus: 'ARCHIVED' | 'VERIFYING' | 'FAILED';
    completedAt: Date;
    archivedAt: Date | null;
    manifest: Record<string, any>;
    reportPackage: Record<string, any> | null;
    warnings: string[] | null;
    createdAt: Date;
}
