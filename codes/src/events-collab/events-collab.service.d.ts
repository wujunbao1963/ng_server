import { DataSource, Repository } from 'typeorm';
import { NgEvent } from '../events-ingest/ng-event.entity';
import { NgEventNote } from './ng-event-note.entity';
import { NgEventStatusIdempotency } from './ng-event-status-idempotency.entity';
type StatusUpdateReq = {
    status: 'OPEN' | 'ACKED' | 'RESOLVED';
    note?: string | null;
    clientRequestId?: string | null;
};
type NotesCreateReq = {
    text: string;
    clientNoteId?: string | null;
};
export declare class EventsCollabService {
    private readonly dataSource;
    private readonly eventsRepo;
    private readonly notesRepo;
    private readonly statusIdemRepo;
    constructor(dataSource: DataSource, eventsRepo: Repository<NgEvent>, notesRepo: Repository<NgEventNote>, statusIdemRepo: Repository<NgEventStatusIdempotency>);
    updateStatus(circleId: string, eventId: string, body: StatusUpdateReq): Promise<any>;
    createNote(circleId: string, eventId: string, body: NotesCreateReq): Promise<any>;
}
export {};
