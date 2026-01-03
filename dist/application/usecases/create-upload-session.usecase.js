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
exports.CreateUploadSessionUseCase = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto = require("crypto");
const logger_service_1 = require("../../common/infra/logger.service");
const clock_port_1 = require("../../common/infra/clock.port");
const ng_http_error_1 = require("../../common/errors/ng-http-error");
const ng_event_entity_1 = require("../../events-ingest/ng-event.entity");
const ng_evidence_session_entity_1 = require("../../evidence/ng-evidence-session.entity");
const ng_evidence_item_entity_1 = require("../../evidence/ng-evidence-item.entity");
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
let CreateUploadSessionUseCase = class CreateUploadSessionUseCase {
    constructor(dataSource, eventsRepo, sessionsRepo, itemsRepo, clock, logger) {
        this.dataSource = dataSource;
        this.eventsRepo = eventsRepo;
        this.sessionsRepo = sessionsRepo;
        this.itemsRepo = itemsRepo;
        this.clock = clock;
        this.logger = logger.setContext('CreateUploadSessionUseCase');
    }
    async execute(circleId, eventId, deviceId, request) {
        const logCtx = { circleId, eventId, deviceId };
        await this.mustEventExist(circleId, eventId);
        const sessionId = crypto.randomUUID();
        const now = this.clock.now();
        const manifest = request?.manifest ?? null;
        const manifestHash = sha256Hex(stableStringify(manifest ?? {}));
        this.logger.log('Creating evidence upload session', logCtx);
        const items = [];
        await this.dataSource.transaction(async (manager) => {
            const sessionRepo = manager.getRepository(ng_evidence_session_entity_1.NgEvidenceSession);
            const itemRepo = manager.getRepository(ng_evidence_item_entity_1.NgEvidenceItem);
            const session = sessionRepo.create({
                id: sessionId,
                circleId,
                eventId,
                edgeDeviceId: deviceId,
                status: 'OPEN',
                evidenceId: null,
                manifestHash,
                createdAt: now,
                completedAt: null,
            });
            await sessionRepo.save(session);
            const manifestItems = (manifest?.items ?? []);
            for (const it of manifestItems) {
                const startAt = it.timeRange?.startAt ? new Date(it.timeRange.startAt) : now;
                const endAt = it.timeRange?.endAt ? new Date(it.timeRange.endAt) : now;
                const deviceKind = String(it.deviceRef?.kind ?? 'other');
                const deviceRefId = String(it.deviceRef?.id ?? 'unknown');
                const deviceDisplayName = it.deviceRef?.displayName
                    ? String(it.deviceRef.displayName)
                    : null;
                const objectKey = `circles/${circleId}/events/${eventId}/${it.sha256}`;
                const row = itemRepo.create({
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
                    deviceRefId: deviceRefId,
                    deviceRefDisplayName: deviceDisplayName,
                    objectKey,
                    timeRange: it.timeRange,
                    deviceRef: it.deviceRef,
                    createdAt: now,
                });
                await itemRepo.save(row);
                items.push({
                    sha256: it.sha256,
                    objectKey,
                    contentType: it.contentType,
                });
            }
        });
        this.logger.log('Evidence upload session created', {
            ...logCtx,
            sessionId,
            itemCount: items.length,
        });
        const presignRequests = items.map((it) => ({
            circleId,
            eventId,
            sha256: it.sha256,
            contentType: it.contentType,
        }));
        return {
            result: {
                sessionId,
                items: items.map((it) => ({
                    sha256: it.sha256,
                    objectKey: it.objectKey,
                })),
            },
            presignRequests,
        };
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
};
exports.CreateUploadSessionUseCase = CreateUploadSessionUseCase;
exports.CreateUploadSessionUseCase = CreateUploadSessionUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(ng_event_entity_1.NgEvent)),
    __param(2, (0, typeorm_1.InjectRepository)(ng_evidence_session_entity_1.NgEvidenceSession)),
    __param(3, (0, typeorm_1.InjectRepository)(ng_evidence_item_entity_1.NgEvidenceItem)),
    __param(4, (0, common_1.Inject)(clock_port_1.CLOCK_PORT)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, Object, logger_service_1.NgLoggerService])
], CreateUploadSessionUseCase);
//# sourceMappingURL=create-upload-session.usecase.js.map