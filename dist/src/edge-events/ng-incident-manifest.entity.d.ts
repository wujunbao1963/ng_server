export declare class NgIncidentManifest {
    id: string;
    circleId: string;
    deviceId: string;
    eventId: string;
    edgeInstanceId: string;
    incidentPacketId: string;
    edgeUpdatedAt: Date;
    lastSequence: string;
    lastPayloadHash: string | null;
    manifestJson: unknown;
    lastUpsertReceivedAt: Date;
}
