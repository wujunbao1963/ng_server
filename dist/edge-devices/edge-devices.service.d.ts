import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NgEdgeDevice } from './ng-edge-device.entity';
import { RegisterEdgeDeviceDto } from './dto/register-edge-device.dto';
import { CirclesService } from '../circles/circles.service';
export type RegisterEdgeDeviceResponse = {
    deviceId: string;
    deviceKey: string;
    pairedAt: string;
    capabilities: {
        fusion: boolean;
        evidenceUpload: boolean;
        topomap: boolean;
    };
};
export declare class EdgeDevicesService {
    private readonly repo;
    private readonly config;
    private readonly circles;
    constructor(repo: Repository<NgEdgeDevice>, config: ConfigService, circles: CirclesService);
    register(userId: string, circleId: string, dto: RegisterEdgeDeviceDto): Promise<RegisterEdgeDeviceResponse>;
    list(userId: string, circleId: string): Promise<Array<{
        deviceId: string;
        name: string | null;
        enabled: boolean;
        pairedAt: string;
        lastSeenAt: string | null;
        capabilities: {
            fusion: boolean;
            evidenceUpload: boolean;
            topomap: boolean;
        };
        metadata: Record<string, any> | null;
    }>>;
    setEnabled(userId: string, circleId: string, deviceId: string, enabled: boolean): Promise<{
        deviceId: string;
        enabled: boolean;
    }>;
    rotateKey(userId: string, circleId: string, deviceId: string): Promise<{
        deviceId: string;
        deviceKey: string;
        rotatedAt: string;
    }>;
}
