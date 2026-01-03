export declare class NgIncidentManifest {
    id: string;
    circleId: string;
    eventId: string;
    edgeInstanceId: string;
    edgeUpdatedAt: Date;
    lastSequence: string;
    lastPayloadHash: string | null;
    manifestJson: unknown;
    lastUpsertReceivedAt: Date;
}
