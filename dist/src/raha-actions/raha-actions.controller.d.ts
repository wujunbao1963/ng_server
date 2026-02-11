import { RahaActionsService } from './raha-actions.service';
import { ExecuteActionDto, HumanActionResultDto } from './dto';
import type { JwtUser } from '../auth/auth.types.ts';
export declare class RahaActionsController {
    private readonly rahaService;
    constructor(rahaService: RahaActionsService);
    executeAction(circleId: string, dto: ExecuteActionDto, req: {
        user: JwtUser;
    }): Promise<HumanActionResultDto>;
    getEdgeUrl(circleId: string, deviceId: string, req: any): Promise<{
        deviceId: string;
        edgeUrl: string | null;
    }>;
    setEdgeUrl(circleId: string, deviceId: string, body: {
        edgeUrl: string;
    }, req: any): Promise<{
        deviceId: string;
        edgeUrl: string;
    }>;
}
