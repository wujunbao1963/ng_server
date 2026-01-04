export declare class NgEdgeDevice {
    id: string;
    circleId: string;
    name: string | null;
    deviceKeyHash: string;
    capabilities: Record<string, any>;
    metadata: Record<string, any> | null;
    createdAt: Date;
    revokedAt: Date | null;
    lastSeenAt: Date | null;
}
