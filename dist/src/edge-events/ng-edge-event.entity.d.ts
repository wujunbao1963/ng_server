export declare class NgEdgeEvent {
    id: string;
    circleId: string;
    eventId: string;
    edgeInstanceId: string;
    threatState: string;
    triggerReason: string | null;
    edgeUpdatedAt: Date;
    lastSequence: string;
    summaryJson: unknown;
    lastPayloadHash: string | null;
    lastUpsertReceivedAt: Date;
}
