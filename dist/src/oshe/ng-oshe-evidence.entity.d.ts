export declare class NgOsheEvidence {
    id: string;
    circleId: string;
    eventId: string;
    evidenceClass: string;
    mediaType: 'video' | 'image' | 'audio';
    capturedAt: Date;
    capturedByUserId: string;
    capturedByRole: string;
    afterThreatState: 'TRIGGERED' | 'RESOLVED';
    source: string;
    presenceVerified: boolean;
    presenceLatitude: number | null;
    presenceLongitude: number | null;
    presenceAccuracyM: number | null;
    presenceVerificationDegraded: boolean;
    fileUrl: string;
    fileName: string | null;
    fileSizeBytes: number | null;
    fileHashSha256: string | null;
    serverReceivedAt: Date;
    timestampDiscrepancy: boolean;
    notes: string | null;
    witnessTaskId: string | null;
    metadata: Record<string, any> | null;
}
