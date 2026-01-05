import { Request } from 'express';
import { NgEdgeDevice } from '../edge-devices/ng-edge-device.entity';
import { ContractsValidatorService } from '../common/contracts/contracts-validator.service';
import { EvidenceService } from './evidence.service';
import { CirclesService } from '../circles/circles.service';
import { JwtUser } from '../auth/auth.types';
import { CompleteEvidenceUseCase } from '../application/usecases';
export declare class EvidenceController {
    private readonly contracts;
    private readonly svc;
    private readonly circles;
    private readonly completeEvidenceUseCase;
    constructor(contracts: ContractsValidatorService, svc: EvidenceService, circles: CirclesService, completeEvidenceUseCase: CompleteEvidenceUseCase);
    createUploadSession(circleId: string, eventId: string, device: NgEdgeDevice, body: unknown): Promise<{
        sessionId: `${string}-${string}-${string}-${string}-${string}`;
        uploadUrls: {
            sha256: string;
            url: string;
        }[];
    }>;
    complete(req: Request, circleId: string, eventId: string, device: NgEdgeDevice, body: unknown): Promise<import("../application/usecases").CompleteEvidenceOutput>;
    getEvidence(req: {
        user: JwtUser;
    }, circleId: string, eventId: string): Promise<{
        eventId: string;
        evidenceId: string;
        evidenceStatus: "ARCHIVED" | "VERIFYING" | "FAILED";
        completedAt: string;
        archivedAt: string | null;
        manifest: Record<string, any>;
        reportPackage: Record<string, any> | null;
        warnings: string[];
    }>;
    downloadUrl(req: {
        user: JwtUser;
    }, circleId: string, eventId: string, sha256: string): Promise<{
        sha256: string;
        url: string;
        expiresAt: string;
    }>;
}
