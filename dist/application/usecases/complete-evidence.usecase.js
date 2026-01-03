"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompleteEvidenceUseCase = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto = require("crypto");
const logger_service_1 = require("../../common/infra/logger.service");
const clock_port_1 = require("../../common/infra/clock.port");
const ng_http_error_1 = require("../../common/errors/ng-http-error");
const ng_event_entity_1 = require("../../events-ingest/ng-event.entity");
const ng_evidence_session_entity_1 = require("../../evidence/ng-evidence-session.entity");
const ng_event_evidence_entity_1 = require("../../evidence/ng-event-evidence.entity");
let CompleteEvidenceUseCase = class CompleteEvidenceUseCase {
    constructor(dataSource, eventsRepo, sessionsRepo, evidenceRepo, clock, logger) {
        this.dataSource = dataSource;
        this.eventsRepo = eventsRepo;
        this.sessionsRepo = sessionsRepo;
        this.evidenceRepo = evidenceRepo;
        this.clock = clock;
        this.logger = logger.setContext('CompleteEvidenceUseCase');
    }
    async execute(circleId, eventId, deviceId, request) {
        const { sessionId } = request;
        const logCtx = { circleId, eventId, deviceId, sessionId };
        await this.mustEventExist(circleId, eventId);
        const session = await this.sessionsRepo.findOne({ where: { id: sessionId } });
        if (!session) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: ng_http_error_1.NgErrorCodes.NOT_FOUND,
                message: 'Evidence session not found',
                timestamp: this.clock.isoNow(),
                retryable: false,
            });
        }
        if (session.circleId !== circleId || session.eventId !== eventId) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 409,
                error: 'Conflict',
                code: ng_http_error_1.NgErrorCodes.EVENT_CONFLICT,
                message: 'Evidence session does not match target event',
                timestamp: this.clock.isoNow(),
                retryable: false,
                details: {
                    sessionCircleId: session.circleId,
                    sessionEventId: session.eventId,
                },
            });
        }
        if (session.status === 'COMPLETED' && session.evidenceId) {
            const existing = await this.evidenceRepo.findOne({
                where: { id: session.evidenceId },
            });
            if (existing) {
                this.logger.log('Evidence already completed, returning cached response', logCtx);
                return this.toResult(existing, true);
            }
        }
        this.logger.log('Completing evidence session', logCtx);
        const evidence = await this.dataSource.transaction(async (manager) => {
            const evidenceRepo = manager.getRepository(ng_event_evidence_entity_1.NgEventEvidence);
            const sessionRepo = manager.getRepository(ng_evidence_session_entity_1.NgEvidenceSession);
            const lockedSession = await sessionRepo.findOne({
                where: { id: sessionId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!lockedSession) {
                throw new ng_http_error_1.NgHttpError({
                    statusCode: 404,
                    error: 'Not Found',
                    code: ng_http_error_1.NgErrorCodes.NOT_FOUND,
                    message: 'Evidence session not found',
                    timestamp: this.clock.isoNow(),
                    retryable: false,
                });
            }
            if (lockedSession.status === 'COMPLETED' && lockedSession.evidenceId) {
                const existing = await evidenceRepo.findOne({
                    where: { id: lockedSession.evidenceId },
                });
                if (existing) {
                    return { evidence: existing, deduped: true };
                }
            }
            const existingForEvent = await evidenceRepo.findOne({ where: { eventId } });
            if (existingForEvent) {
                if (existingForEvent.sessionId === sessionId) {
                    return { evidence: existingForEvent, deduped: true };
                }
                throw new ng_http_error_1.NgHttpError({
                    statusCode: 409,
                    error: 'Conflict',
                    code: ng_http_error_1.NgErrorCodes.EVENT_CONFLICT,
                    message: 'Evidence already completed for this event',
                    timestamp: this.clock.isoNow(),
                    retryable: false,
                });
            }
            const now = this.clock.now();
            const { warnings, reportPackage } = this.processReportPackage(request.reportPackage);
            const evidenceId = crypto.randomUUID();
            const newEvidence = evidenceRepo.create({
                id: evidenceId,
                circleId,
                eventId,
                sessionId,
                evidenceStatus: 'ARCHIVED',
                completedAt: now,
                archivedAt: now,
                manifest: request.manifest,
                reportPackage,
                warnings: warnings.length ? warnings : null,
                createdAt: now,
            });
            await evidenceRepo.save(newEvidence);
            lockedSession.status = 'COMPLETED';
            lockedSession.completedAt = now;
            lockedSession.evidenceId = evidenceId;
            await sessionRepo.save(lockedSession);
            this.logger.log('Evidence completed successfully', { ...logCtx, evidenceId });
            return { evidence: newEvidence, deduped: false };
        });
        return this.toResult(evidence.evidence, evidence.deduped);
    }
    processReportPackage(reportReq) {
        const warnings = [];
        let reportPackage = { included: false, status: 'NONE' };
        if (reportReq && reportReq.included === true) {
            warnings.push('REPORT_PACKAGE_NOT_SUPPORTED');
            reportPackage = {
                included: true,
                type: reportReq.type,
                sha256: reportReq.sha256,
                status: 'FAILED',
            };
        }
        return { warnings, reportPackage };
    }
    async mustEventExist(circleId, eventId) {
        const ev = await this.eventsRepo.findOne({ where: { circleId, eventId } });
        if (!ev) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: ng_http_error_1.NgErrorCodes.NOT_FOUND,
                message: 'Event not found',
                timestamp: this.clock.isoNow(),
                retryable: false,
            });
        }
    }
    toResult(ev, deduped) {
        return {
            evidenceId: ev.id,
            eventId: ev.eventId,
            sessionId: ev.sessionId,
            evidenceStatus: ev.evidenceStatus,
            completedAt: ev.completedAt,
            archivedAt: ev.archivedAt,
            manifest: ev.manifest,
            reportPackage: ev.reportPackage,
            warnings: ev.warnings ?? [],
            deduped,
        };
    }
};
exports.CompleteEvidenceUseCase = CompleteEvidenceUseCase;
exports.CompleteEvidenceUseCase = CompleteEvidenceUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(ng_event_entity_1.NgEvent)),
    __param(2, (0, typeorm_1.InjectRepository)(ng_evidence_session_entity_1.NgEvidenceSession)),
    __param(3, (0, typeorm_1.InjectRepository)(ng_event_evidence_entity_1.NgEventEvidence)),
    __param(4, (0, common_1.Inject)(clock_port_1.CLOCK_PORT)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, Object, logger_service_1.NgLoggerService])
], CompleteEvidenceUseCase);
//# sourceMappingURL=complete-evidence.usecase.js.map