export declare class NgLedgerEntry {
    id: string;
    edgeInstanceId: string;
    circleId: string;
    ledgerSeq: number;
    entryType: string;
    eventId: string | null;
    actorId: string | null;
    actorRole: string | null;
    deviceTime: Date;
    monoTime: number | null;
    timeQuality: string;
    payload: Record<string, any>;
    contractVersion: string;
    edgeSpecVersion: string;
    idempotencyKey: string;
    receivedAt: Date;
}
