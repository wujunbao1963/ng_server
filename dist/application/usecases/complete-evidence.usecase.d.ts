import { DataSource, Repository } from 'typeorm';
import { NgLoggerService } from '../../common/infra/logger.service';
import { ClockPort } from '../../common/infra/clock.port';
import { NgEvent } from '../../events-ingest/ng-event.entity';
import { NgEvidenceSession } from '../../evidence/ng-evidence-session.entity';
import { NgEventEvidence } from '../../evidence/ng-event-evidence.entity';
export interface CompleteEvidenceRequest {
    sessionId: string;
    manifest?: any;
    reportPackage?: {
        included: boolean;
        type?: string;
        sha256?: string;
    };
}
export interface CompleteEvidenceResult {
    evidenceId: string;
    eventId: string;
    sessionId: string;
    evidenceStatus: string;
    completedAt: Date;
    archivedAt: Date | null;
    manifest: any;
    reportPackage: any;
    warnings: string[];
    deduped: boolean;
}
export declare class CompleteEvidenceUseCase {
    private readonly dataSource;
    private readonly eventsRepo;
    private readonly sessionsRepo;
    private readonly evidenceRepo;
    private readonly clock;
    private readonly logger;
    constructor(dataSource: DataSource, eventsRepo: Repository<NgEvent>, sessionsRepo: Repository<NgEvidenceSession>, evidenceRepo: Repository<NgEventEvidence>, clock: ClockPort, logger: NgLoggerService);
    execute(circleId: string, eventId: string, deviceId: string, request: CompleteEvidenceRequest): Promise<CompleteEvidenceResult>;
    private processReportPackage;
    private mustEventExist;
    private toResult;
}
