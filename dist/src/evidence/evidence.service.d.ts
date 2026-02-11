import { DataSource, Repository } from 'typeorm';
import { NgEdgeDevice } from '../edge-devices/ng-edge-device.entity';
import { NgEvent } from '../events-ingest/ng-event.entity';
import { NgEvidenceItem } from './ng-evidence-item.entity';
import { NgEvidenceSession } from './ng-evidence-session.entity';
import { NgEventEvidence } from './ng-event-evidence.entity';
import { EvidenceStorageService } from './evidence-storage.service';
export declare class EvidenceService {
    private readonly dataSource;
    private readonly eventsRepo;
    private readonly sessionsRepo;
    private readonly itemsRepo;
    private readonly evidenceRepo;
    private readonly storage;
    constructor(dataSource: DataSource, eventsRepo: Repository<NgEvent>, sessionsRepo: Repository<NgEvidenceSession>, itemsRepo: Repository<NgEvidenceItem>, evidenceRepo: Repository<NgEventEvidence>, storage: EvidenceStorageService);
    createUploadSession(device: NgEdgeDevice, circleId: string, eventId: string, req: any): Promise<{
        sessionId: `${string}-${string}-${string}-${string}-${string}`;
        uploadUrls: {
            sha256: string;
            url: string;
        }[];
    }>;
    completeEvidence(device: NgEdgeDevice, circleId: string, eventId: string, req: any): Promise<any>;
    getEvidence(circleId: string, eventId: string): Promise<{
        eventId: string;
        evidenceId: string;
        evidenceStatus: "ARCHIVED" | "VERIFYING" | "FAILED";
        completedAt: string;
        archivedAt: string | null;
        manifest: Record<string, any>;
        reportPackage: Record<string, any> | null;
        warnings: string[];
    }>;
    getDownloadUrl(circleId: string, eventId: string, sha256: string): Promise<{
        sha256: string;
        url: string;
        expiresAt: string;
    }>;
    private mustEventExist;
    private toCompleteResponse;
}
