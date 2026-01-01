import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { NgEdgeEvent } from './ng-edge-event.entity';
import { NgEdgeEventSummaryRaw } from './ng-edge-event-summary-raw.entity';
import { NgEdgeIngestAudit } from './ng-edge-ingest-audit.entity';
import { stableStringify } from '../common/utils/stable-json';

export type EdgeEventSummaryUpsertV77 = {
  schemaVersion: 'v7.7';
  circleId: string;
  eventId: string;
  edgeInstanceId: string;
  threatState: string;
  updatedAt: string;
  sequence?: number;
  triggerReason?: string;
  [k: string]: unknown;
};

export type EdgeSummaryUpsertResult = {
  applied: boolean;
  reason: 'applied' | 'stale_sequence' | 'stale_timestamp' | 'duplicate_payload';
};

@Injectable()
export class EdgeEventsService {
  constructor(
    @InjectRepository(NgEdgeEventSummaryRaw)
    private readonly rawRepo: Repository<NgEdgeEventSummaryRaw>,
    @InjectRepository(NgEdgeEvent)
    private readonly edgeRepo: Repository<NgEdgeEvent>,
    @InjectRepository(NgEdgeIngestAudit)
    private readonly auditRepo: Repository<NgEdgeIngestAudit>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * List edge events for a circle (App read API)
   */
  async listEvents(circleId: string, limit: number = 50): Promise<{ items: any[]; nextCursor: string | null }> {
    const events = await this.edgeRepo.find({
      where: { circleId },
      order: { edgeUpdatedAt: 'DESC' },
      take: limit,
    });

    const items = events.map((ev) => ({
      eventId: ev.eventId,
      edgeInstanceId: ev.edgeInstanceId,
      threatState: ev.threatState,
      triggerReason: ev.triggerReason,
      occurredAt: ev.edgeUpdatedAt.toISOString(),
      updatedAt: ev.edgeUpdatedAt.toISOString(),
      status: this.mapThreatStateToStatus(ev.threatState),
      title: this.generateTitle(ev),
      // Include summary fields if available
      ...(ev.summaryJson && typeof ev.summaryJson === 'object' ? this.extractSummaryFields(ev.summaryJson as Record<string, unknown>) : {}),
    }));

    return { items, nextCursor: null };
  }

  /**
   * Get single edge event
   */
  async getEvent(circleId: string, eventId: string): Promise<any> {
    const ev = await this.edgeRepo.findOne({ where: { circleId, eventId } });
    if (!ev) {
      return null;
    }

    return {
      eventId: ev.eventId,
      edgeInstanceId: ev.edgeInstanceId,
      threatState: ev.threatState,
      triggerReason: ev.triggerReason,
      occurredAt: ev.edgeUpdatedAt.toISOString(),
      updatedAt: ev.edgeUpdatedAt.toISOString(),
      status: this.mapThreatStateToStatus(ev.threatState),
      title: this.generateTitle(ev),
      summaryJson: ev.summaryJson,
    };
  }

  private mapThreatStateToStatus(threatState: string): string {
    // Map threatState to app-friendly status
    if (threatState === 'RESOLVED' || threatState === 'CANCELED') return 'RESOLVED';
    if (threatState === 'TRIGGERED') return 'OPEN';
    return 'OPEN';
  }

  private generateTitle(ev: NgEdgeEvent): string {
    const reasonMap: Record<string, string> = {
      'entry_delay_expired': '入侵警报',
      'motion': '移动检测',
      'door_open': '门窗打开',
      'glass_break': '玻璃破碎',
    };
    return reasonMap[ev.triggerReason || ''] || '安全事件';
  }

  private extractSummaryFields(summary: Record<string, unknown>): Record<string, unknown> {
    const fields: Record<string, unknown> = {};
    if (summary.entryPointId) fields.entryPointId = summary.entryPointId;
    if (summary.mode) fields.mode = summary.mode;
    if (summary.workflowClass) fields.workflowClass = summary.workflowClass;
    if (summary.zoneId) fields.zoneId = summary.zoneId;
    return fields;
  }

  /**
   * Step 2 behavior:
   *  - Always store raw landing row (audit/debug).
   *  - Upsert authoritative snapshot into ng_edge_events with sequence + timestamp rules.
   */
  async storeSummaryUpsert(payload: EdgeEventSummaryUpsertV77): Promise<EdgeSummaryUpsertResult> {
    const incomingSeq = typeof payload.sequence === 'number' ? payload.sequence : 0;
    const incomingUpdatedAt = new Date(payload.updatedAt);
    const payloadHash = sha256Hex(stableStringify(payload));

    return await this.dataSource.transaction(async (manager) => {
      // 1) Raw landing write (always).
      const rawRow = this.rawRepo.create({
        circleId: payload.circleId,
        eventId: payload.eventId,
        edgeInstanceId: payload.edgeInstanceId,
        threatState: payload.threatState,
        edgeUpdatedAt: incomingUpdatedAt,
        payload,
      });
      await manager.getRepository(NgEdgeEventSummaryRaw).save(rawRow);

      // 2) Authoritative snapshot upsert.
      const repo = manager.getRepository(NgEdgeEvent);
      const audit = manager.getRepository(NgEdgeIngestAudit);
      const existing = await repo.findOne({
        where: { circleId: payload.circleId, eventId: payload.eventId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!existing) {
        const created = repo.create({
          circleId: payload.circleId,
          eventId: payload.eventId,
          edgeInstanceId: payload.edgeInstanceId,
          threatState: payload.threatState,
          triggerReason: (payload as any).triggerReason ?? null,
          edgeUpdatedAt: incomingUpdatedAt,
          lastSequence: String(incomingSeq),
          summaryJson: payload,
          lastPayloadHash: payloadHash,
        });
        await repo.save(created);
        await audit.insert({
          circleId: payload.circleId,
          eventId: payload.eventId,
          edgeInstanceId: payload.edgeInstanceId,
          sequence: String(incomingSeq),
          payloadHash,
          applied: true,
          reason: 'applied',
          schemaVersion: payload.schemaVersion,
          messageType: 'event_summary_upsert',
        });
        return { applied: true, reason: 'applied' };
      }

      const storedSeq = Number(existing.lastSequence ?? '0');

      // Step 3: strong retry-dedup for same-sequence identical payload.
      if (incomingSeq === storedSeq && existing.lastPayloadHash && existing.lastPayloadHash === payloadHash) {
        await audit.insert({
          circleId: payload.circleId,
          eventId: payload.eventId,
          edgeInstanceId: payload.edgeInstanceId,
          sequence: String(incomingSeq),
          payloadHash,
          applied: false,
          reason: 'duplicate_payload',
          schemaVersion: payload.schemaVersion,
          messageType: 'event_summary_upsert',
        });
        return { applied: false, reason: 'duplicate_payload' };
      }

      if (incomingSeq < storedSeq) {
        await audit.insert({
          circleId: payload.circleId,
          eventId: payload.eventId,
          edgeInstanceId: payload.edgeInstanceId,
          sequence: String(incomingSeq),
          payloadHash,
          applied: false,
          reason: 'stale_sequence',
          schemaVersion: payload.schemaVersion,
          messageType: 'event_summary_upsert',
        });
        return { applied: false, reason: 'stale_sequence' };
      }

      if (incomingSeq === storedSeq) {
        if (incomingUpdatedAt.getTime() <= existing.edgeUpdatedAt.getTime()) {
          await audit.insert({
            circleId: payload.circleId,
            eventId: payload.eventId,
            edgeInstanceId: payload.edgeInstanceId,
            sequence: String(incomingSeq),
            payloadHash,
            applied: false,
            reason: 'stale_timestamp',
            schemaVersion: payload.schemaVersion,
            messageType: 'event_summary_upsert',
          });
          return { applied: false, reason: 'stale_timestamp' };
        }
      }

      // Apply update.
      existing.edgeInstanceId = payload.edgeInstanceId;
      existing.threatState = payload.threatState;
      existing.triggerReason = (payload as any).triggerReason ?? null;
      existing.edgeUpdatedAt = incomingUpdatedAt;
      existing.lastSequence = String(incomingSeq);
      existing.summaryJson = payload;
      existing.lastPayloadHash = payloadHash;
      await repo.save(existing);

      await audit.insert({
        circleId: payload.circleId,
        eventId: payload.eventId,
        edgeInstanceId: payload.edgeInstanceId,
        sequence: String(incomingSeq),
        payloadHash,
        applied: true,
        reason: 'applied',
        schemaVersion: payload.schemaVersion,
        messageType: 'event_summary_upsert',
      });

      return { applied: true, reason: 'applied' };
    });
  }
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}
