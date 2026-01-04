import { NgEdgeDevice } from '../edge-devices/ng-edge-device.entity';
import { ContractsValidatorService } from '../common/contracts/contracts-validator.service';
import { EvidenceService } from './evidence.service';
import { CirclesService } from '../circles/circles.service';
import { JwtUser } from '../auth/auth.types';
export declare class EvidenceController {
    private readonly contracts;
    private readonly svc;
    private readonly circles;
    constructor(contracts: ContractsValidatorService, svc: EvidenceService, circles: CirclesService);
    createUploadSession(circleId: string, eventId: string, device: NgEdgeDevice, body: unknown): Promise<{
        sessionId: `${string}-${string}-${string}-${string}-${string}`;
        uploadUrls: {
            sha256: string;
            url: string;
        }[];
    }>;
    complete(circleId: string, eventId: string, device: NgEdgeDevice, body: unknown): Promise<any>;
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
