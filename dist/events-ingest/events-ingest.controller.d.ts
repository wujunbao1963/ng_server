import { NgEdgeDevice } from '../edge-devices/ng-edge-device.entity';
import { ContractsValidatorService } from '../common/contracts/contracts-validator.service';
import { EventsIngestService } from './events-ingest.service';
export declare class EventsIngestController {
    private readonly contracts;
    private readonly svc;
    constructor(contracts: ContractsValidatorService, svc: EventsIngestService);
    ingest(circleId: string, device: NgEdgeDevice, body: unknown): Promise<import("./events-ingest.service").IngestResp>;
}
