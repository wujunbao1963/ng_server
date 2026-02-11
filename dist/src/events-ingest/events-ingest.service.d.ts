import { DataSource, Repository } from 'typeorm';
import { NgEdgeDevice } from '../edge-devices/ng-edge-device.entity';
import { NgEvent } from './ng-event.entity';
import { NgEventIdempotency } from './ng-event-idempotency.entity';
type IngestReq = {
    idempotencyKey: string;
    event: any;
};
export type IngestResp = {
    accepted: boolean;
    eventId: string;
    serverReceivedAt: string;
    deduped?: boolean;
};
export declare class EventsIngestService {
    private readonly dataSource;
    private readonly eventsRepo;
    private readonly idemRepo;
    constructor(dataSource: DataSource, eventsRepo: Repository<NgEvent>, idemRepo: Repository<NgEventIdempotency>);
    ingest(device: NgEdgeDevice, circleId: string, body: IngestReq): Promise<IngestResp>;
}
export {};
