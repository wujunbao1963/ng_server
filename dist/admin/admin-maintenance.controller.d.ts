import { JwtUser } from '../auth/auth.types';
import { EvidenceTicketsService } from '../evidence-tickets/evidence-tickets.service';
export declare class AdminMaintenanceController {
    private readonly evidence;
    constructor(evidence: EvidenceTicketsService);
    purgeExpired(req: {
        user: JwtUser;
    }): Promise<{
        deletedTickets: number;
        deletedLeases: number;
        ok: boolean;
    }>;
}
