import { DataSource, Repository } from 'typeorm';
import { NgLoggerService } from '../../common/infra/logger.service';
import { ClockPort } from '../../common/infra/clock.port';
import { NgEdgeEvent } from '../../edge-events/ng-edge-event.entity';
import { NgEdgeEventSummaryRaw } from '../../edge-events/ng-edge-event-summary-raw.entity';
import { NgEdgeIngestAudit } from '../../edge-events/ng-edge-ingest-audit.entity';
export type EdgeEventSummaryUpsertV77 = {
    schemaVersion: 'v7.7';
    circleId: string;
    eventId: string;
    edgeInstanceId: string;
    threatState: string;
    updatedAt: string;
    sequence?: number;
    triggerReason?: string;
    workflowClass?: string;
    entryPointId?: string;
    [k: string]: unknown;
};
export type EdgeSummaryUpsertResult = {
    applied: boolean;
    reason: 'applied' | 'stale_sequence' | 'stale_timestamp' | 'duplicate_payload';
    eventId: string;
    isNew: boolean;
};
export type NotificationDispatchRequest = {
    type: 'PARCEL_DETECTED';
    circleId: string;
    eventId: string;
    edgeInstanceId: string;
    entryPointId?: string;
};
export declare class IngestEdgeEventUseCase {
    private readonly dataSource;
    private readonly rawRepo;
    private readonly edgeRepo;
    private readonly auditRepo;
    private readonly clock;
    private readonly logger;
    constructor(dataSource: DataSource, rawRepo: Repository<NgEdgeEventSummaryRaw>, edgeRepo: Repository<NgEdgeEvent>, auditRepo: Repository<NgEdgeIngestAudit>, clock: ClockPort, logger: NgLoggerService);
    execute(payload: EdgeEventSummaryUpsertV77): Promise<{
        result: EdgeSummaryUpsertResult;
        notifications: NotificationDispatchRequest[];
    }>;
}
