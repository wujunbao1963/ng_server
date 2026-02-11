export declare class NgEvidenceItem {
    id: string;
    sessionId: string;
    circleId: string;
    eventId: string;
    sha256: string;
    type: string;
    contentType: string;
    size: string;
    timeRangeStartAt: Date;
    timeRangeEndAt: Date;
    deviceRefKind: string;
    deviceRefId: string;
    deviceRefDisplayName: string | null;
    objectKey: string;
    timeRange: Record<string, any> | null;
    deviceRef: Record<string, any> | null;
    createdAt: Date;
}
