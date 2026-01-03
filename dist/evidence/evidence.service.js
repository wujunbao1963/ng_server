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
exports.EvidenceService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ng_http_error_1 = require("../common/errors/ng-http-error");
const ng_event_evidence_entity_1 = require("./ng-event-evidence.entity");
const evidence_storage_service_1 = require("./evidence-storage.service");
const logger_service_1 = require("../common/infra/logger.service");
const clock_port_1 = require("../common/infra/clock.port");
const application_1 = require("../application");
let EvidenceService = class EvidenceService {
    constructor(evidenceRepo, storage, createUploadSessionUseCase, completeEvidenceUseCase, clock, logger) {
        this.evidenceRepo = evidenceRepo;
        this.storage = storage;
        this.createUploadSessionUseCase = createUploadSessionUseCase;
        this.completeEvidenceUseCase = completeEvidenceUseCase;
        this.clock = clock;
        this.logger = logger.setContext('EvidenceService');
    }
    async createUploadSession(device, circleId, eventId, req) {
        const logCtx = { circleId, eventId, deviceId: device.id };
        const { result, presignRequests } = await this.createUploadSessionUseCase.execute(circleId, eventId, device.id, { manifest: req?.manifest });
        const uploadUrls = [];
        for (const presignReq of presignRequests) {
            const presigned = await this.storage.presignUploadUrl(presignReq);
            uploadUrls.push({ sha256: presignReq.sha256, url: presigned.url });
        }
        this.logger.log('Evidence upload session created with URLs', {
            ...logCtx,
            sessionId: result.sessionId,
            urlCount: uploadUrls.length,
        });
        return {
            sessionId: result.sessionId,
            uploadUrls,
        };
    }
    async completeEvidence(device, circleId, eventId, req) {
        const result = await this.completeEvidenceUseCase.execute(circleId, eventId, device.id, {
            sessionId: req.sessionId,
            manifest: req.manifest,
            reportPackage: req.reportPackage,
        });
        return this.toCompleteResponse(result);
    }
    async getEvidence(circleId, eventId) {
        const ev = await this.evidenceRepo.findOne({ where: { circleId, eventId } });
        if (!ev) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: ng_http_error_1.NgErrorCodes.NOT_FOUND,
                message: 'Evidence not found',
                timestamp: this.clock.isoNow(),
                retryable: false,
            });
        }
        return {
            eventId: ev.eventId,
            evidenceId: ev.id,
            evidenceStatus: ev.evidenceStatus,
            completedAt: ev.completedAt.toISOString(),
            archivedAt: ev.archivedAt ? ev.archivedAt.toISOString() : null,
            manifest: ev.manifest,
            reportPackage: ev.reportPackage,
            warnings: ev.warnings ?? [],
        };
    }
    async getDownloadUrl(circleId, eventId, sha256) {
        const ev = await this.evidenceRepo.findOne({ where: { circleId, eventId } });
        if (!ev) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: ng_http_error_1.NgErrorCodes.NOT_FOUND,
                message: 'Evidence not found',
                timestamp: this.clock.isoNow(),
                retryable: false,
            });
        }
        const items = ev.manifest?.items ?? [];
        const found = items.find((x) => x.sha256 === sha256);
        if (!found) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: ng_http_error_1.NgErrorCodes.NOT_FOUND,
                message: 'Evidence item not found',
                timestamp: this.clock.isoNow(),
                retryable: false,
            });
        }
        const { url, expiresAt } = await this.storage.presignDownloadUrl({
            circleId,
            eventId,
            sha256,
        });
        return { sha256, url, expiresAt };
    }
    toCompleteResponse(result) {
        const warnings = result.warnings.map((code) => ({
            code,
            message: code === 'REPORT_PACKAGE_NOT_SUPPORTED'
                ? 'Report package upload is not supported in v1 mock storage.'
                : 'See code for details.',
        }));
        const resp = {
            accepted: true,
            eventId: result.eventId,
            sessionId: result.sessionId,
            evidenceId: result.evidenceId,
            evidenceStatus: result.evidenceStatus,
            completedAt: result.completedAt.toISOString(),
            archivedAt: result.archivedAt ? result.archivedAt.toISOString() : null,
            manifest: result.manifest,
            reportPackage: result.reportPackage,
            deduped: result.deduped ? true : undefined,
            warnings: warnings.length ? warnings : undefined,
        };
        return resp;
    }
};
exports.EvidenceService = EvidenceService;
exports.EvidenceService = EvidenceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_event_evidence_entity_1.NgEventEvidence)),
    __param(4, (0, common_1.Inject)(clock_port_1.CLOCK_PORT)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        evidence_storage_service_1.EvidenceStorageService,
        application_1.CreateUploadSessionUseCase,
        application_1.CompleteEvidenceUseCase, Object, logger_service_1.NgLoggerService])
], EvidenceService);
//# sourceMappingURL=evidence.service.js.map