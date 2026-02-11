import { ContractsValidatorService } from '../common/contracts/contracts-validator.service';
import { EventsCollabService } from './events-collab.service';
import { CirclesService } from '../circles/circles.service';
import { JwtUser } from '../auth/auth.types';
export declare class EventsCollabController {
    private readonly svc;
    private readonly contracts;
    private readonly circles;
    constructor(svc: EventsCollabService, contracts: ContractsValidatorService, circles: CirclesService);
    updateStatus(req: {
        user: JwtUser;
    }, circleId: string, eventId: string, body: unknown): Promise<any>;
    createNote(req: {
        user: JwtUser;
    }, circleId: string, eventId: string, body: unknown): Promise<any>;
}
