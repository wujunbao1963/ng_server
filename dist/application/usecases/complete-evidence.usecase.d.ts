import { NgEdgeDevice } from '../../edge-devices/ng-edge-device.entity';
import { EvidenceService } from '../../evidence/evidence.service';
export interface CompleteEvidenceInput {
    device: NgEdgeDevice;
    circleId: string;
    eventId: string;
    sessionId: string;
    manifest: {
        items: any[];
    };
    reportPackage?: {
        included: boolean;
        type?: string;
        sha256?: string;
    };
    requestId?: string;
}
export interface CompleteEvidenceOutput {
    evidenceId: string;
    status: string;
    completedAt: string;
    manifest: any;
    reportPackage: any;
    warnings?: string[];
    deduplicated?: boolean;
}
export declare class CompleteEvidenceUseCase {
    private readonly evidenceService;
    private readonly logger;
    constructor(evidenceService: EvidenceService);
    execute(input: CompleteEvidenceInput): Promise<CompleteEvidenceOutput>;
}
