import { ContractsValidatorService } from '../common/contracts/contracts-validator.service';
import { CirclesService } from '../circles/circles.service';
import { JwtUser } from '../auth/auth.types';
import { EvidenceTicketsService } from './evidence-tickets.service';
export declare class EvidenceTicketsController {
    private readonly svc;
    private readonly circles;
    private readonly contracts;
    constructor(svc: EvidenceTicketsService, circles: CirclesService, contracts: ContractsValidatorService);
    createTicket(req: {
        user: JwtUser;
    }, circleId: string, eventId: string, body: unknown): Promise<{
        ok: boolean;
        ticketId: string;
        evidenceKey: string;
        expiresAt: string;
        accessMode: string;
    }>;
}
