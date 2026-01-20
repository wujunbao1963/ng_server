import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NgLedgerEntry } from './ng-ledger-entry.entity';

/**
 * Ledger entry from Edge (single)
 */
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

/**
 * Batch upload from Edge
 */
export interface LedgerBatchDto {
  contractVersion: string;
  edgeSpecVersion: string;
  edgeInstanceId: string;
  batchId: string;
  fromSeq: number;
  toSeq: number;
  entries: LedgerEntryDto[];
}

/**
 * Response to Edge
 */
export interface LedgerIngestResponse {
  ok: boolean;
  ackedSeq: number;
  insertedCount: number;
  skippedCount: number;
  error?: string;
  retryable?: boolean;
}

@Injectable()
export class LedgerIngestService {
  private readonly logger = new Logger(LedgerIngestService.name);

  constructor(
    @InjectRepository(NgLedgerEntry)
    private readonly repo: Repository<NgLedgerEntry>,
  ) {}

  /**
   * Ingest a batch of ledger entries from Edge.
   * 
   * Implements:
   * - Idempotency via idempotencyKey
   * - Out-of-order handling (Contract §3.2)
   * - Partial success
   */
  async ingestBatch(
    circleId: string,
    batch: LedgerBatchDto,
  ): Promise<LedgerIngestResponse> {
    const { edgeInstanceId, entries } = batch;
    
    if (!entries || entries.length === 0) {
      return {
        ok: true,
        ackedSeq: batch.toSeq,
        insertedCount: 0,
        skippedCount: 0,
      };
    }

    let insertedCount = 0;
    let skippedCount = 0;
    let maxSeq = 0;
    const errors: string[] = [];

    for (const entry of entries) {
      try {
        const result = await this.ingestEntry(circleId, edgeInstanceId, entry);
        
        if (result.inserted) {
          insertedCount++;
        } else {
          skippedCount++;
        }
        
        if (entry.ledgerSeq > maxSeq) {
          maxSeq = entry.ledgerSeq;
        }
      } catch (err) {
        this.logger.error(`Failed to ingest entry ${entry.idempotencyKey}: ${err}`);
        errors.push(`Entry ${entry.ledgerSeq}: ${err}`);
      }
    }

    // Update ack tracking
    await this.updateAckSeq(circleId, edgeInstanceId, maxSeq);

    return {
      ok: errors.length === 0,
      ackedSeq: maxSeq,
      insertedCount,
      skippedCount,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      retryable: false,
    };
  }

  /**
   * Ingest a single ledger entry.
   * 
   * Uses idempotencyKey for deduplication.
   */
  async ingestEntry(
    circleId: string,
    edgeInstanceId: string,
    entry: LedgerEntryDto,
  ): Promise<{ inserted: boolean }> {
    // Check if already exists (idempotency)
    const existing = await this.repo.findOne({
      where: { idempotencyKey: entry.idempotencyKey },
    });

    if (existing) {
      this.logger.debug(`Skipping duplicate entry: ${entry.idempotencyKey}`);
      return { inserted: false };
    }

    // Create entity
    const entity = new NgLedgerEntry();
    entity.id = `${edgeInstanceId}:${entry.ledgerSeq}`;
    entity.edgeInstanceId = edgeInstanceId;
    entity.circleId = circleId;
    entity.ledgerSeq = entry.ledgerSeq;
    entity.entryType = entry.entryType;
    entity.eventId = entry.eventId ?? null;
    entity.actorId = entry.actorId ?? null;
    entity.actorRole = entry.actorRole ?? null;
    entity.deviceTime = new Date(entry.deviceTime);
    entity.monoTime = entry.monoTime ?? null;
    entity.timeQuality = entry.timeQuality ?? 'SYNCED';
    entity.payload = entry.payload ?? {};
    entity.contractVersion = entry.contractVersion;
    entity.edgeSpecVersion = entry.edgeSpecVersion;
    entity.idempotencyKey = entry.idempotencyKey;

    await this.repo.save(entity);
    
    this.logger.debug(`Ingested ledger entry: ${entry.idempotencyKey}`);
    return { inserted: true };
  }

  /**
   * Get current ack sequence for an Edge device.
   */
  async getAckSeq(circleId: string, edgeInstanceId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('e')
      .select('MAX(e.ledger_seq)', 'maxSeq')
      .where('e.circle_id = :circleId', { circleId })
      .andWhere('e.edge_instance_id = :edgeInstanceId', { edgeInstanceId })
      .getRawOne();
    
    return result?.maxSeq ?? 0;
  }

  /**
   * Update ack sequence tracking (for future pull-based sync).
   */
  private async updateAckSeq(
    circleId: string,
    edgeInstanceId: string,
    seq: number,
  ): Promise<void> {
    // Could store in a separate table for tracking
    // For now, we just derive from max ledger_seq
  }

  /**
   * Query ledger entries for an event.
   */
  async getEntriesForEvent(
    circleId: string,
    eventId: string,
    limit = 100,
  ): Promise<NgLedgerEntry[]> {
    return this.repo.find({
      where: { circleId, eventId },
      order: { ledgerSeq: 'ASC' },
      take: limit,
    });
  }

  /**
   * Query ledger entries by type.
   */
  async getEntriesByType(
    circleId: string,
    entryType: string,
    limit = 100,
  ): Promise<NgLedgerEntry[]> {
    return this.repo.find({
      where: { circleId, entryType },
      order: { ledgerSeq: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get recent entries for a device.
   */
  async getRecentEntries(
    circleId: string,
    edgeInstanceId: string,
    limit = 50,
  ): Promise<NgLedgerEntry[]> {
    return this.repo.find({
      where: { circleId, edgeInstanceId },
      order: { ledgerSeq: 'DESC' },
      take: limit,
    });
  }
}
