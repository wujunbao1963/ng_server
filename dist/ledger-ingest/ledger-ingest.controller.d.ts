import { NgEdgeDevice } from '../edge-devices/ng-edge-device.entity';
import { CirclesService } from '../circles/circles.service';
import { LedgerIngestService, LedgerBatchDto, LedgerIngestResponse } from './ledger-ingest.service';
export declare class LedgerIngestController {
    private readonly svc;
    private readonly circles;
    constructor(svc: LedgerIngestService, circles: CirclesService);
    uploadBatch(circleId: string, device: NgEdgeDevice, body: LedgerBatchDto): Promise<LedgerIngestResponse>;
    getAckSeq(circleId: string, device: NgEdgeDevice, edgeInstanceId: string): Promise<{
        ok: boolean;
        error: string;
        edgeInstanceId?: undefined;
        ackedSeq?: undefined;
    } | {
        ok: boolean;
        edgeInstanceId: string;
        ackedSeq: number;
        error?: undefined;
    }>;
    postAck(circleId: string, device: NgEdgeDevice, body: {
        ackedSeq: number;
    }): Promise<{
        ok: boolean;
        ackedSeq: number;
    }>;
    queryLedger(circleId: string, eventId?: string, entryType?: string, edgeInstanceId?: string, limitStr?: string): Promise<{
        entries: import("./ng-ledger-entry.entity").NgLedgerEntry[];
        count: number;
    }>;
}
