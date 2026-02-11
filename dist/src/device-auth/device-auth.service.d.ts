import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NgEdgeDevice } from '../edge-devices/ng-edge-device.entity';
export declare class DeviceAuthService {
    private readonly repo;
    private readonly config;
    constructor(repo: Repository<NgEdgeDevice>, config: ConfigService);
    validateDeviceKey(deviceKey: string): Promise<NgEdgeDevice>;
}
