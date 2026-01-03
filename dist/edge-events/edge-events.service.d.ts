import { Repository } from 'typeorm';
import { NgEdgeEvent } from './ng-edge-event.entity';
import { NgLoggerService } from '../common/infra/logger.service';
import { ClockPort } from '../common/infra/clock.port';
import { IngestEdgeEventUseCase, EdgeEventSummaryUpsertV77, EdgeSummaryUpsertResult } from '../application/usecases/ingest-edge-event.usecase';
import { NotificationsService } from '../notifications/notifications.service';
import { CirclesService } from '../circles/circles.service';
export { EdgeEventSummaryUpsertV77, EdgeSummaryUpsertResult };
export declare class EdgeEventsService {
    private readonly edgeRepo;
    private readonly clock;
    private readonly ingestUseCase;
    private readonly notificationsService;
    private readonly circlesService;
    private readonly logger;
    constructor(edgeRepo: Repository<NgEdgeEvent>, clock: ClockPort, ingestUseCase: IngestEdgeEventUseCase, notificationsService: NotificationsService, circlesService: CirclesService, logger: NgLoggerService);
    listEvents(circleId: string, limit?: number): Promise<{
        items: any[];
        nextCursor: string | null;
    }>;
    getEvent(circleId: string, eventId: string): Promise<any>;
    updateEventStatus(circleId: string, eventId: string, status: 'OPEN' | 'ACKED' | 'RESOLVED', note?: string): Promise<{
        updated: boolean;
        eventId: string;
        status: string;
        updatedAt: string;
    }>;
    private mapThreatStateToStatus;
    private generateTitle;
    private extractSummaryFields;
    storeSummaryUpsert(payload: EdgeEventSummaryUpsertV77): Promise<EdgeSummaryUpsertResult>;
    private dispatchNotification;
}
