import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NgEdgeDevice } from '../edge-devices/ng-edge-device.entity';
import { CirclesService } from '../circles/circles.service';
import { ExecuteActionDto, HumanActionResultDto } from './dto';
export declare class RahaActionsService {
    private readonly edgeDevicesRepo;
    private readonly circlesService;
    private readonly config;
    private readonly logger;
    private readonly defaultEdgeUrl;
    private readonly forwardTimeout;
    constructor(edgeDevicesRepo: Repository<NgEdgeDevice>, circlesService: CirclesService, config: ConfigService);
    executeAction(userId: string, circleId: string, dto: ExecuteActionDto): Promise<HumanActionResultDto>;
    private getUserRole;
    private mapToActorRole;
    private getEdgeDevice;
    private forwardToEdge;
    updateEdgeUrl(userId: string, circleId: string, deviceId: string, edgeUrl: string): Promise<{
        deviceId: string;
        edgeUrl: string;
    }>;
    getEdgeUrl(userId: string, circleId: string, deviceId: string): Promise<{
        deviceId: string;
        edgeUrl: string | null;
    }>;
}
