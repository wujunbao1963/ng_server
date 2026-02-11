import { DataSource, Repository } from 'typeorm';
import { NgEdgeEvent } from './ng-edge-event.entity';
import { NgEdgeEventSummaryRaw } from './ng-edge-event-summary-raw.entity';
import { NgEdgeIngestAudit } from './ng-edge-ingest-audit.entity';
import { NgLedgerEntry } from '../ledger-ingest/ng-ledger-entry.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CirclesService } from '../circles/circles.service';
import { EdgeCommandsService } from './edge-commands.service';
import { EventViewModelService, EventViewModel } from './event-viewmodel.service';
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
export type EdgeEventSummaryUpsertV771 = EdgeEventSummaryUpsertV77 & {
    notificationEligible?: boolean;
    notificationHint?: {
        suppressReason?: 'MODE_HOME' | 'MODE_DISARM' | 'BELOW_THRESHOLD' | null;
        preLevel?: 'L0' | 'L1' | 'L2';
    };
    evidenceCapture?: {
        sessionCount?: number;
        clipCount?: number;
        anchorCount?: number;
        hasPresenceSession?: boolean;
    };
};
export type EdgeSummaryUpsertResult = {
    applied: boolean;
    reason: 'applied' | 'stale_sequence' | 'stale_timestamp' | 'duplicate_payload';
};
export declare class EdgeEventsService {
    private readonly rawRepo;
    private readonly edgeRepo;
    private readonly auditRepo;
    private readonly ledgerRepo;
    private readonly dataSource;
    private readonly notificationsService;
    private readonly circlesService;
    private readonly commandsService;
    private readonly viewModelService;
    private readonly logger;
    constructor(rawRepo: Repository<NgEdgeEventSummaryRaw>, edgeRepo: Repository<NgEdgeEvent>, auditRepo: Repository<NgEdgeIngestAudit>, ledgerRepo: Repository<NgLedgerEntry>, dataSource: DataSource, notificationsService: NotificationsService, circlesService: CirclesService, commandsService: EdgeCommandsService, viewModelService: EventViewModelService);
    listEvents(circleId: string, limit?: number): Promise<{
        items: EventViewModel[];
        nextCursor: string | null;
    }>;
    getEvent(circleId: string, eventId: string): Promise<EventViewModel | null>;
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
    private writeLedgerEntry;
    private maybeCreateNotification;
}
