export declare class NgEdgeCommand {
    id: string;
    circleId: string;
    edgeInstanceId: string;
    commandType: string;
    commandPayload: Record<string, unknown> | null;
    status: 'pending' | 'delivered' | 'executed' | 'failed' | 'expired';
    triggeredByUserId: string | null;
    eventId: string | null;
    createdAt: Date;
    deliveredAt: Date | null;
    executedAt: Date | null;
    expiresAt: Date;
    resultMessage: string | null;
}
