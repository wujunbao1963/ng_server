import { NgEdgeDevice } from '../edge-devices/ng-edge-device.entity';
export declare class DeviceAuthController {
    me(device: NgEdgeDevice): Promise<{
        deviceId: string;
        circleId: string;
        capabilities: Record<string, any>;
        createdAt: string;
        lastSeenAt: string | null;
    }>;
}
