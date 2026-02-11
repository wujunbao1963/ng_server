import { ContractsValidatorService } from '../common/contracts/contracts-validator.service';
import { EventsReadService } from './events-read.service';
import { ListEventsQueryDto } from './dto/list-events.query.dto';
import { CirclesService } from '../circles/circles.service';
import { JwtUser } from '../auth/auth.types';
export declare class EventsReadController {
    private readonly svc;
    private readonly contracts;
    private readonly circles;
    constructor(svc: EventsReadService, contracts: ContractsValidatorService, circles: CirclesService);
    list(req: {
        user: JwtUser;
    }, circleId: string, query: ListEventsQueryDto): Promise<import("./events-read.service").EventsListResponse>;
    get(req: {
        user: JwtUser;
    }, circleId: string, eventId: string): Promise<any>;
}
