import { CirclesService } from '../circles/circles.service';
import { JwtUser } from '../auth/auth.types';
import { EvidenceTicketsService } from './evidence-tickets.service';
import { ContractsValidatorService } from '../common/contracts/contracts-validator.service';
export declare class EvidenceTicketMetaController {
    private readonly svc;
    private readonly circles;
    private readonly contracts;
    constructor(svc: EvidenceTicketsService, circles: CirclesService, contracts: ContractsValidatorService);
    meta(req: {
        user: JwtUser;
    }, ticketId: string): Promise<{
        ok: boolean;
        ticketId: string;
        evidenceKey: string;
        contentType: string;
        contentLength: number | null;
        acceptRanges: string | null;
    }>;
}
