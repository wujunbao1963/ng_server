import { ContractsValidatorService } from '../common/contracts/contracts-validator.service';
import { EdgeEventsService } from './edge-events.service';
import { IncidentManifestsService } from './incident-manifests.service';
import { CirclesService } from '../circles/circles.service';
import { JwtUser } from '../auth/auth.types';
import { IngestEdgeEventUseCase } from '../application/usecases';
export declare class EdgeEventsController {
    private readonly contracts;
    private readonly svc;
    private readonly manifests;
    private readonly circles;
    private readonly ingestEdgeEventUseCase;
    constructor(contracts: ContractsValidatorService, svc: EdgeEventsService, manifests: IncidentManifestsService, circles: CirclesService, ingestEdgeEventUseCase: IngestEdgeEventUseCase);
    listEvents(req: {
        user: JwtUser;
    }, circleId: string, limitStr?: string): Promise<{
        items: import("./event-viewmodel.service").EventViewModel[];
        nextCursor: string | null;
    }>;
    getEvent(req: {
        user: JwtUser;
    }, circleId: string, eventId: string): Promise<import("./event-viewmodel.service").EventViewModel>;
    updateStatus(req: {
        user: JwtUser;
    }, circleId: string, eventId: string, body: {
        status: 'OPEN' | 'ACKED' | 'RESOLVED';
        note?: string;
    }): Promise<{
        updated: boolean;
        eventId: string;
        status: string;
        updatedAt: string;
        commandId?: string;
    }>;
    summaryUpsert(circleId: string, body: unknown): Promise<import("../application/usecases").IngestEdgeEventOutput>;
    manifestUpsert(circleId: string, eventId: string, body: unknown): Promise<{
        ok: boolean;
        applied: boolean;
        reason: "applied" | "stale_sequence" | "stale_timestamp" | "duplicate_payload";
        serverReceivedAt: string;
    }>;
}
