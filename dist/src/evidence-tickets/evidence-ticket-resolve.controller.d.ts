import { ContractsValidatorService } from '../common/contracts/contracts-validator.service';
import { CirclesService } from '../circles/circles.service';
import { JwtUser } from '../auth/auth.types';
import { EvidenceTicketsService } from './evidence-tickets.service';
export declare class EvidenceTicketResolveController {
    private readonly svc;
    private readonly circles;
    private readonly contracts;
    constructor(svc: EvidenceTicketsService, circles: CirclesService, contracts: ContractsValidatorService);
    resolve(req: {
        user: JwtUser;
    }, ticketId: string): Promise<any>;
}
