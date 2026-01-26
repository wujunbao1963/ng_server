export declare class NgEdgeIngestAudit {
    id: string;
    circleId: string;
    eventId: string;
    edgeInstanceId: string;
    sequence: string;
    payloadHash: string;
    applied: boolean;
    reason: string;
    schemaVersion: string;
    messageType: string;
    notificationEligible: boolean | null;
    notificationSuppressReason: string | null;
    receivedAt: Date;
}
