import { NgEdgeDevice } from '../edge-devices/ng-edge-device.entity';
export declare class NgEvent {
    eventId: string;
    circleId: string;
    edgeDeviceId: string;
    edgeDevice: NgEdgeDevice;
    title: string;
    description: string | null;
    eventType: string;
    severity: string;
    notificationLevel: string;
    status: string;
    occurredAt: Date;
    receivedAt: Date;
    updatedAt: Date;
    ackedAt: Date | null;
    resolvedAt: Date | null;
    explainSummary: Record<string, any>;
    alarmState: string | null;
    zonesVisited: any[] | null;
    keySignals: any[] | null;
    rawEvent: Record<string, any>;
}
