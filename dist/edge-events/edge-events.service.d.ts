import { DataSource, Repository } from 'typeorm';
import { NgEdgeEvent } from './ng-edge-event.entity';
import { NgEdgeEventSummaryRaw } from './ng-edge-event-summary-raw.entity';
import { NgEdgeIngestAudit } from './ng-edge-ingest-audit.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CirclesService } from '../circles/circles.service';
import { EdgeCommandsService } from './edge-commands.service';
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
export declare class EdgeEventsService {
    private readonly rawRepo;
    private readonly edgeRepo;
    private readonly auditRepo;
    private readonly dataSource;
    private readonly notificationsService;
    private readonly circlesService;
    private readonly commandsService;
    private readonly logger;
    constructor(rawRepo: Repository<NgEdgeEventSummaryRaw>, edgeRepo: Repository<NgEdgeEvent>, auditRepo: Repository<NgEdgeIngestAudit>, dataSource: DataSource, notificationsService: NotificationsService, circlesService: CirclesService, commandsService: EdgeCommandsService);
    listEvents(circleId: string, limit?: number): Promise<{
        items: any[];
        nextCursor: string | null;
    }>;
    getEvent(circleId: string, eventId: string): Promise<any>;
    updateEventStatus(circleId: string, eventId: string, status: 'OPEN' | 'ACKED' | 'RESOLVED', note?: string, triggeredByUserId?: string): Promise<{
        updated: boolean;
        eventId: string;
        status: string;
        updatedAt: string;
        commandId?: string;
    }>;
    private mapThreatStateToStatus;
    private generateTitle;
    private extractSummaryFields;
    storeSummaryUpsert(payload: EdgeEventSummaryUpsertV77): Promise<EdgeSummaryUpsertResult>;
    private maybeCreateNotification;
}
