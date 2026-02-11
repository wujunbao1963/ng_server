import { Repository } from 'typeorm';
import { NgOsheEvidence } from './ng-oshe-evidence.entity';
import { NgCircle } from '../circles/ng-circle.entity';
import { NgRole } from '../roles/ng-role.entity';
import { CirclesService } from '../circles/circles.service';
export interface CreateOsheDto {
    eventId: string;
    mediaType: 'video' | 'image' | 'audio';
    capturedAt: string;
    afterThreatState: 'TRIGGERED' | 'RESOLVED';
    fileUrl: string;
    fileName?: string;
    fileSizeBytes?: number;
    fileHashSha256?: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    presenceVerificationDegraded?: boolean;
    notes?: string;
    witnessTaskId?: string;
}
export interface EventContext {
    eventId: string;
    threatState: 'TRIGGERED' | 'RESOLVED';
    stateChangedAt: Date;
}
export declare class OsheService {
    private readonly osheRepo;
    private readonly circlesRepo;
    private readonly rolesRepo;
    private readonly circles;
    constructor(osheRepo: Repository<NgOsheEvidence>, circlesRepo: Repository<NgCircle>, rolesRepo: Repository<NgRole>, circles: CirclesService);
    createOshe(userId: string, circleId: string, dto: CreateOsheDto, eventContext: EventContext): Promise<NgOsheEvidence>;
    createFromWitnessTask(userId: string, circleId: string, witnessTaskId: string, photos: Array<{
        url: string;
        fileName?: string;
        fileSizeBytes?: number;
    }>, eventContext: EventContext | null, location: {
        latitude: number;
        longitude: number;
        accuracy?: number;
    }): Promise<NgOsheEvidence[]>;
    listByEvent(userId: string, circleId: string, eventId: string): Promise<NgOsheEvidence[]>;
    getOshe(userId: string, circleId: string, eventId: string, osheId: string): Promise<NgOsheEvidence>;
    getManifestItems(circleId: string, eventId: string): Promise<Array<{
        itemId: string;
        type: string;
        source: string;
        auditWeight: string;
        capturedAt: string;
        capturedByRole: string;
        afterThreatState: string;
    }>>;
    private validateOsheRole;
    private validateEventState;
    private validateTimeWindow;
    private validatePresence;
    private validateFileConstraints;
    private calculateDistance;
    private toRad;
    private makeError;
}
