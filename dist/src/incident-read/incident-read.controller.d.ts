import { ContractsValidatorService } from '../common/contracts/contracts-validator.service';
import { CirclesService } from '../circles/circles.service';
import { JwtUser } from '../auth/auth.types';
import { IncidentReadService } from './incident-read.service';
export declare class IncidentReadController {
    private readonly svc;
    private readonly circles;
    private readonly contracts;
    constructor(svc: IncidentReadService, circles: CirclesService, contracts: ContractsValidatorService);
    getManifest(req: {
        user: JwtUser;
    }, circleId: string, eventId: string): Promise<{
        ok: boolean;
        circleId: string;
        eventId: string;
        edgeInstanceId: string;
        edgeUpdatedAt: string;
        sequence: number;
        manifest: any;
    }>;
}
