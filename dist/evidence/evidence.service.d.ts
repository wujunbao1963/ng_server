import { Repository } from 'typeorm';
import { NgEdgeDevice } from '../edge-devices/ng-edge-device.entity';
import { NgEventEvidence } from './ng-event-evidence.entity';
import { EvidenceStorageService } from './evidence-storage.service';
import { NgLoggerService } from '../common/infra/logger.service';
import { ClockPort } from '../common/infra/clock.port';
import { CompleteEvidenceUseCase, CreateUploadSessionUseCase } from '../application';
export declare class EvidenceService {
    private readonly evidenceRepo;
    private readonly storage;
    private readonly createUploadSessionUseCase;
    private readonly completeEvidenceUseCase;
    private readonly clock;
    private readonly logger;
    constructor(evidenceRepo: Repository<NgEventEvidence>, storage: EvidenceStorageService, createUploadSessionUseCase: CreateUploadSessionUseCase, completeEvidenceUseCase: CompleteEvidenceUseCase, clock: ClockPort, logger: NgLoggerService);
    createUploadSession(device: NgEdgeDevice, circleId: string, eventId: string, req: any): Promise<{
        sessionId: string;
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
    private toCompleteResponse;
}
