import { EdgeEventsService, EdgeEventSummaryUpsertV77, EdgeSummaryUpsertResult } from '../../edge-events/edge-events.service';
export interface IngestEdgeEventInput {
    payload: EdgeEventSummaryUpsertV77;
    requestId?: string;
}
export interface IngestEdgeEventOutput {
    ok: boolean;
    applied: boolean;
    reason: EdgeSummaryUpsertResult['reason'];
    serverReceivedAt: string;
}
export declare class IngestEdgeEventUseCase {
    private readonly edgeEventsService;
    private readonly logger;
    constructor(edgeEventsService: EdgeEventsService);
    execute(input: IngestEdgeEventInput): Promise<IngestEdgeEventOutput>;
}
