import { Repository } from 'typeorm';
import { NgLedgerEntry } from './ng-ledger-entry.entity';
export interface LedgerEntryDto {
    contractVersion: string;
    edgeSpecVersion: string;
    edgeInstanceId: string;
    ledgerSeq: number;
    entryType: string;
    eventId?: string | null;
    deviceTime: string;
    monoTime?: number | null;
    timeQuality?: string;
    actorId?: string | null;
    actorRole?: string | null;
    payload?: Record<string, any>;
    idempotencyKey: string;
}
export interface LedgerBatchDto {
    contractVersion: string;
    edgeSpecVersion: string;
    edgeInstanceId: string;
    batchId: string;
    fromSeq: number;
    toSeq: number;
    entries: LedgerEntryDto[];
}
export interface LedgerIngestResponse {
    ok: boolean;
    ackedSeq: number;
    insertedCount: number;
    skippedCount: number;
    error?: string;
    retryable?: boolean;
}
export declare class LedgerIngestService {
    private readonly repo;
    private readonly logger;
    constructor(repo: Repository<NgLedgerEntry>);
    ingestBatch(circleId: string, batch: LedgerBatchDto): Promise<LedgerIngestResponse>;
    ingestEntry(circleId: string, edgeInstanceId: string, entry: LedgerEntryDto): Promise<{
        inserted: boolean;
    }>;
    getAckSeq(circleId: string, edgeInstanceId: string): Promise<number>;
    private updateAckSeq;
    getEntriesForEvent(circleId: string, eventId: string, limit?: number): Promise<NgLedgerEntry[]>;
    getEntriesByType(circleId: string, entryType: string, limit?: number): Promise<NgLedgerEntry[]>;
    getRecentEntries(circleId: string, edgeInstanceId: string, limit?: number): Promise<NgLedgerEntry[]>;
}
