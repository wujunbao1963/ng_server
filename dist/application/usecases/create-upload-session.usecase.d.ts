import { DataSource, Repository } from 'typeorm';
import { NgLoggerService } from '../../common/infra/logger.service';
import { ClockPort } from '../../common/infra/clock.port';
import { NgEvent } from '../../events-ingest/ng-event.entity';
import { NgEvidenceSession } from '../../evidence/ng-evidence-session.entity';
import { NgEvidenceItem } from '../../evidence/ng-evidence-item.entity';
export interface EvidenceManifestItem {
    sha256: string;
    type: string;
    contentType: string;
    size: number;
    timeRange?: {
        startAt: string;
        endAt: string;
    };
    deviceRef?: {
        kind: string;
        id: string;
        displayName?: string;
    };
}
export interface CreateUploadSessionRequest {
    manifest?: {
        items?: EvidenceManifestItem[];
    };
}
export interface CreateUploadSessionResult {
    sessionId: string;
    items: Array<{
        sha256: string;
        objectKey: string;
    }>;
}
export interface PresignRequest {
    circleId: string;
    eventId: string;
    sha256: string;
    contentType: string;
}
export interface EvidenceStoragePort {
    presignUploadUrl(req: PresignRequest): Promise<{
        url: string;
        objectKey: string;
        expiresAt: string;
    }>;
}
export declare class CreateUploadSessionUseCase {
    private readonly dataSource;
    private readonly eventsRepo;
    private readonly sessionsRepo;
    private readonly itemsRepo;
    private readonly clock;
    private readonly logger;
    constructor(dataSource: DataSource, eventsRepo: Repository<NgEvent>, sessionsRepo: Repository<NgEvidenceSession>, itemsRepo: Repository<NgEvidenceItem>, clock: ClockPort, logger: NgLoggerService);
    execute(circleId: string, eventId: string, deviceId: string, request: CreateUploadSessionRequest): Promise<{
        result: CreateUploadSessionResult;
        presignRequests: PresignRequest[];
    }>;
    private mustEventExist;
}
