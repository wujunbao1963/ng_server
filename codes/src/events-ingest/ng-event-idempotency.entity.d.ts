import { NgEdgeDevice } from '../edge-devices/ng-edge-device.entity';
import { NgEvent } from './ng-event.entity';
export declare class NgEventIdempotency {
    id: string;
    edgeDeviceId: string;
    edgeDevice: NgEdgeDevice;
    idempotencyKey: string;
    eventId: string;
    event: NgEvent;
    payloadHash: string;
    createdAt: Date;
}
