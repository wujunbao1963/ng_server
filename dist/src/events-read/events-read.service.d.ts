import { Repository } from 'typeorm';
import { NgEvent } from '../events-ingest/ng-event.entity';
import { NgEventNote } from '../events-collab/ng-event-note.entity';
import { NgEvidenceSession } from '../evidence/ng-evidence-session.entity';
import { NgEventEvidence } from '../evidence/ng-event-evidence.entity';
export type EventsListResponse = {
    items: any[];
    nextCursor: string | null;
};
export declare class EventsReadService {
    private readonly eventsRepo;
    private readonly notesRepo;
    private readonly evidenceSessionsRepo;
    private readonly eventEvidenceRepo;
    constructor(eventsRepo: Repository<NgEvent>, notesRepo: Repository<NgEventNote>, evidenceSessionsRepo: Repository<NgEvidenceSession>, eventEvidenceRepo: Repository<NgEventEvidence>);
    list(circleId: string, limit: number, cursor?: string): Promise<EventsListResponse>;
    get(circleId: string, eventId: string): Promise<any>;
    private toSummary;
    private toDetail;
    private toEvidenceSummary;
}
