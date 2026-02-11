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
const crypto = require("crypto");
const typeorm_2 = require("typeorm");
const ng_http_error_1 = require("../common/errors/ng-http-error");
const ng_event_entity_1 = require("../events-ingest/ng-event.entity");
const ng_evidence_item_entity_1 = require("./ng-evidence-item.entity");
const ng_evidence_session_entity_1 = require("./ng-evidence-session.entity");
const ng_event_evidence_entity_1 = require("./ng-event-evidence.entity");
const evidence_storage_service_1 = require("./evidence-storage.service");
function stableStringify(value) {
    if (value === null || value === undefined)
        return String(value);
    if (Array.isArray(value))
        return '[' + value.map(stableStringify).join(',') + ']';
    if (typeof value === 'object') {
        const keys = Object.keys(value).sort();
        return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
    }
    return JSON.stringify(value);
}
function sha256Hex(input) {
    return crypto.createHash('sha256').update(input).digest('hex');
}
let EvidenceService = class EvidenceService {
    constructor(dataSource, eventsRepo, sessionsRepo, itemsRepo, evidenceRepo, storage) {
        this.dataSource = dataSource;
        this.eventsRepo = eventsRepo;
        this.sessionsRepo = sessionsRepo;
        this.itemsRepo = itemsRepo;
        this.evidenceRepo = evidenceRepo;
        this.storage = storage;
    }
    async createUploadSession(device, circleId, eventId, req) {
        await this.mustEventExist(circleId, eventId);
        const sessionId = crypto.randomUUID();
        const now = new Date();
        const manifest = req?.manifest ?? null;
        const manifestHash = sha256Hex(stableStringify(manifest ?? {}));
        await this.dataSource.transaction(async (trx) => {
            const session = trx.getRepository(ng_evidence_session_entity_1.NgEvidenceSession).create({
                id: sessionId,
                circleId,
                eventId,
                edgeDeviceId: device.id,
                status: 'OPEN',
                evidenceId: null,
                manifestHash,
                createdAt: now,
                completedAt: null,
            });
            await trx.getRepository(ng_evidence_session_entity_1.NgEvidenceSession).save(session);
            const items = (manifest?.items ?? []);
            for (const it of items) {
                const startAt = new Date(it.timeRange?.startAt);
                const endAt = new Date(it.timeRange?.endAt);
                const deviceKind = String(it.deviceRef?.kind ?? 'other');
                const deviceId = String(it.deviceRef?.id ?? 'unknown');
                const deviceDisplayName = it.deviceRef?.displayName ? String(it.deviceRef.displayName) : null;
                const objectKey = `circles/${circleId}/events/${eventId}/${it.sha256}`;
                const row = trx.getRepository(ng_evidence_item_entity_1.NgEvidenceItem).create({
                    id: crypto.randomUUID(),
                    sessionId,
                    circleId,
                    eventId,
                    sha256: it.sha256,
                    type: it.type,
                    contentType: it.contentType,
                    size: String(it.size),
                    timeRangeStartAt: startAt,
                    timeRangeEndAt: endAt,
                    deviceRefKind: deviceKind,
                    deviceRefId: deviceId,
                    deviceRefDisplayName: deviceDisplayName,
                    objectKey,
                    timeRange: it.timeRange,
                    deviceRef: it.deviceRef,
                    createdAt: now,
                });
                await trx.getRepository(ng_evidence_item_entity_1.NgEvidenceItem).save(row);
            }
        });
        const items = (manifest?.items ?? []);
        const uploadUrls = [];
        for (const it of items) {
            const presigned = await this.storage.presignUploadUrl({
                circleId,
                eventId,
                sha256: it.sha256,
                contentType: it.contentType,
            });
            uploadUrls.push({ sha256: it.sha256, url: presigned.url });
        }
        return { sessionId, uploadUrls };
    }
    async completeEvidence(device, circleId, eventId, req) {
        await this.mustEventExist(circleId, eventId);
        const sessionId = req.sessionId;
        const session = await this.sessionsRepo.findOne({ where: { id: sessionId } });
        if (!session) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: ng_http_error_1.NgErrorCodes.NOT_FOUND,
                message: 'Evidence session not found',
                timestamp: new Date().toISOString(),
                retryable: false,
            });
        }
        if (session.circleId !== circleId || session.eventId !== eventId) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 409,
                error: 'Conflict',
                code: ng_http_error_1.NgErrorCodes.EVENT_CONFLICT,
                message: 'Evidence session does not match target event',
                timestamp: new Date().toISOString(),
                retryable: false,
                details: { sessionCircleId: session.circleId, sessionEventId: session.eventId },
            });
        }
        if (session.status === 'COMPLETED' && session.evidenceId) {
            const existing = await this.evidenceRepo.findOne({ where: { id: session.evidenceId } });
            if (existing) {
                return this.toCompleteResponse(existing, true);
            }
        }
        const existingForEvent = await this.evidenceRepo.findOne({ where: { eventId } });
        if (existingForEvent) {
            if (existingForEvent.sessionId === sessionId) {
                return this.toCompleteResponse(existingForEvent, true);
            }
            throw new ng_http_error_1.NgHttpError({
                statusCode: 409,
                error: 'Conflict',
                code: ng_http_error_1.NgErrorCodes.EVENT_CONFLICT,
                message: 'Evidence already completed for this event',
                timestamp: new Date().toISOString(),
                retryable: false,
            });
        }
        const now = new Date();
        const reportReq = req.reportPackage ?? null;
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
        const evidenceId = crypto.randomUUID();
        const evidence = await this.dataSource.transaction(async (trx) => {
            const evidenceEntity = trx.getRepository(ng_event_evidence_entity_1.NgEventEvidence).create({
                id: evidenceId,
                circleId,
                eventId,
                sessionId,
                evidenceStatus: 'ARCHIVED',
                completedAt: now,
                archivedAt: now,
                manifest: req.manifest,
                reportPackage,
                warnings: warnings.length ? warnings : null,
                createdAt: now,
            });
            await trx.getRepository(ng_event_evidence_entity_1.NgEventEvidence).save(evidenceEntity);
            session.status = 'COMPLETED';
            session.completedAt = now;
            session.evidenceId = evidenceId;
            await trx.getRepository(ng_evidence_session_entity_1.NgEvidenceSession).save(session);
            return evidenceEntity;
        });
        return this.toCompleteResponse(evidence, false);
    }
    async getEvidence(circleId, eventId) {
        const ev = await this.evidenceRepo.findOne({ where: { circleId, eventId } });
        if (!ev) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: ng_http_error_1.NgErrorCodes.NOT_FOUND,
                message: 'Evidence not found',
                timestamp: new Date().toISOString(),
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
                timestamp: new Date().toISOString(),
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
                timestamp: new Date().toISOString(),
                retryable: false,
            });
        }
        const { url, expiresAt } = await this.storage.presignDownloadUrl({ circleId, eventId, sha256 });
        return { sha256, url, expiresAt };
    }
    async mustEventExist(circleId, eventId) {
        const ev = await this.eventsRepo.findOne({ where: { circleId, eventId } });
        if (!ev) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: ng_http_error_1.NgErrorCodes.NOT_FOUND,
                message: 'Event not found',
                timestamp: new Date().toISOString(),
                retryable: false,
            });
        }
    }
    toCompleteResponse(ev, deduped) {
        const warnings = (ev.warnings ?? []).map((code) => ({
            code,
            message: code === 'REPORT_PACKAGE_NOT_SUPPORTED'
                ? 'Report package upload is not supported in v1 mock storage.'
                : 'See code for details.',
        }));
        const resp = {
            accepted: true,
            eventId: ev.eventId,
            sessionId: ev.sessionId,
            evidenceId: ev.id,
            evidenceStatus: ev.evidenceStatus,
            completedAt: ev.completedAt.toISOString(),
            archivedAt: ev.archivedAt ? ev.archivedAt.toISOString() : null,
            manifest: ev.manifest,
            reportPackage: ev.reportPackage,
            deduped: deduped ? true : undefined,
            warnings: warnings.length ? warnings : undefined,
        };
        return resp;
    }
};
exports.EvidenceService = EvidenceService;
exports.EvidenceService = EvidenceService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(ng_event_entity_1.NgEvent)),
    __param(2, (0, typeorm_1.InjectRepository)(ng_evidence_session_entity_1.NgEvidenceSession)),
    __param(3, (0, typeorm_1.InjectRepository)(ng_evidence_item_entity_1.NgEvidenceItem)),
    __param(4, (0, typeorm_1.InjectRepository)(ng_event_evidence_entity_1.NgEventEvidence)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        evidence_storage_service_1.EvidenceStorageService])
], EvidenceService);
//# sourceMappingURL=evidence.service.js.map