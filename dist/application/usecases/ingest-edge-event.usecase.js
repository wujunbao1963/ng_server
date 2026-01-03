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
exports.IngestEdgeEventUseCase = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto = require("crypto");
const logger_service_1 = require("../../common/infra/logger.service");
const clock_port_1 = require("../../common/infra/clock.port");
const stable_json_1 = require("../../common/utils/stable-json");
const ng_edge_event_entity_1 = require("../../edge-events/ng-edge-event.entity");
const ng_edge_event_summary_raw_entity_1 = require("../../edge-events/ng-edge-event-summary-raw.entity");
const ng_edge_ingest_audit_entity_1 = require("../../edge-events/ng-edge-ingest-audit.entity");
let IngestEdgeEventUseCase = class IngestEdgeEventUseCase {
    constructor(dataSource, rawRepo, edgeRepo, auditRepo, clock, logger) {
        this.dataSource = dataSource;
        this.rawRepo = rawRepo;
        this.edgeRepo = edgeRepo;
        this.auditRepo = auditRepo;
        this.clock = clock;
        this.logger = logger.setContext('IngestEdgeEventUseCase');
    }
    async execute(payload) {
        const incomingSeq = typeof payload.sequence === 'number' ? payload.sequence : 0;
        const incomingUpdatedAt = new Date(payload.updatedAt);
        const payloadHash = sha256Hex((0, stable_json_1.stableStringify)(payload));
        const logCtx = {
            circleId: payload.circleId,
            eventId: payload.eventId,
            deviceId: payload.edgeInstanceId,
        };
        this.logger.log('Processing edge event summary upsert', {
            ...logCtx,
            sequence: incomingSeq,
            threatState: payload.threatState,
        });
        const result = await this.dataSource.transaction(async (manager) => {
            const rawRow = this.rawRepo.create({
                circleId: payload.circleId,
                eventId: payload.eventId,
                edgeInstanceId: payload.edgeInstanceId,
                threatState: payload.threatState,
                edgeUpdatedAt: incomingUpdatedAt,
                payload,
            });
            await manager.getRepository(ng_edge_event_summary_raw_entity_1.NgEdgeEventSummaryRaw).save(rawRow);
            const repo = manager.getRepository(ng_edge_event_entity_1.NgEdgeEvent);
            const audit = manager.getRepository(ng_edge_ingest_audit_entity_1.NgEdgeIngestAudit);
            const existing = await repo.findOne({
                where: { circleId: payload.circleId, eventId: payload.eventId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!existing) {
                const created = repo.create({
                    circleId: payload.circleId,
                    eventId: payload.eventId,
                    edgeInstanceId: payload.edgeInstanceId,
                    threatState: payload.threatState,
                    triggerReason: payload.triggerReason ?? null,
                    edgeUpdatedAt: incomingUpdatedAt,
                    lastSequence: String(incomingSeq),
                    summaryJson: payload,
                    lastPayloadHash: payloadHash,
                });
                await repo.save(created);
                await audit.insert({
                    circleId: payload.circleId,
                    eventId: payload.eventId,
                    edgeInstanceId: payload.edgeInstanceId,
                    sequence: String(incomingSeq),
                    payloadHash,
                    applied: true,
                    reason: 'applied',
                    schemaVersion: payload.schemaVersion,
                    messageType: 'event_summary_upsert',
                });
                this.logger.log('Created new edge event', logCtx);
                return { applied: true, reason: 'applied', isNew: true };
            }
            const storedSeq = Number(existing.lastSequence ?? '0');
            if (incomingSeq === storedSeq &&
                existing.lastPayloadHash &&
                existing.lastPayloadHash === payloadHash) {
                await audit.insert({
                    circleId: payload.circleId,
                    eventId: payload.eventId,
                    edgeInstanceId: payload.edgeInstanceId,
                    sequence: String(incomingSeq),
                    payloadHash,
                    applied: false,
                    reason: 'duplicate_payload',
                    schemaVersion: payload.schemaVersion,
                    messageType: 'event_summary_upsert',
                });
                this.logger.log('Duplicate payload detected, skipping', logCtx);
                return { applied: false, reason: 'duplicate_payload', isNew: false };
            }
            if (incomingSeq < storedSeq) {
                await audit.insert({
                    circleId: payload.circleId,
                    eventId: payload.eventId,
                    edgeInstanceId: payload.edgeInstanceId,
                    sequence: String(incomingSeq),
                    payloadHash,
                    applied: false,
                    reason: 'stale_sequence',
                    schemaVersion: payload.schemaVersion,
                    messageType: 'event_summary_upsert',
                });
                this.logger.log('Stale sequence detected, skipping', {
                    ...logCtx,
                    incomingSeq,
                    storedSeq,
                });
                return { applied: false, reason: 'stale_sequence', isNew: false };
            }
            if (incomingSeq === storedSeq) {
                if (incomingUpdatedAt.getTime() <= existing.edgeUpdatedAt.getTime()) {
                    await audit.insert({
                        circleId: payload.circleId,
                        eventId: payload.eventId,
                        edgeInstanceId: payload.edgeInstanceId,
                        sequence: String(incomingSeq),
                        payloadHash,
                        applied: false,
                        reason: 'stale_timestamp',
                        schemaVersion: payload.schemaVersion,
                        messageType: 'event_summary_upsert',
                    });
                    this.logger.log('Stale timestamp detected, skipping', logCtx);
                    return { applied: false, reason: 'stale_timestamp', isNew: false };
                }
            }
            existing.edgeInstanceId = payload.edgeInstanceId;
            existing.threatState = payload.threatState;
            existing.triggerReason = payload.triggerReason ?? null;
            existing.edgeUpdatedAt = incomingUpdatedAt;
            existing.lastSequence = String(incomingSeq);
            existing.summaryJson = payload;
            existing.lastPayloadHash = payloadHash;
            await repo.save(existing);
            await audit.insert({
                circleId: payload.circleId,
                eventId: payload.eventId,
                edgeInstanceId: payload.edgeInstanceId,
                sequence: String(incomingSeq),
                payloadHash,
                applied: true,
                reason: 'applied',
                schemaVersion: payload.schemaVersion,
                messageType: 'event_summary_upsert',
            });
            this.logger.log('Updated edge event', logCtx);
            return { applied: true, reason: 'applied', isNew: false };
        });
        const notifications = [];
        if (result.applied) {
            if (payload.workflowClass === 'LOGISTICS' && payload.triggerReason === 'delivery_detected') {
                notifications.push({
                    type: 'PARCEL_DETECTED',
                    circleId: payload.circleId,
                    eventId: payload.eventId,
                    edgeInstanceId: payload.edgeInstanceId,
                    entryPointId: payload.entryPointId,
                });
                this.logger.log('Notification dispatch requested: PARCEL_DETECTED', logCtx);
            }
        }
        return {
            result: {
                ...result,
                eventId: payload.eventId,
            },
            notifications,
        };
    }
};
exports.IngestEdgeEventUseCase = IngestEdgeEventUseCase;
exports.IngestEdgeEventUseCase = IngestEdgeEventUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(ng_edge_event_summary_raw_entity_1.NgEdgeEventSummaryRaw)),
    __param(2, (0, typeorm_1.InjectRepository)(ng_edge_event_entity_1.NgEdgeEvent)),
    __param(3, (0, typeorm_1.InjectRepository)(ng_edge_ingest_audit_entity_1.NgEdgeIngestAudit)),
    __param(4, (0, common_1.Inject)(clock_port_1.CLOCK_PORT)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, Object, logger_service_1.NgLoggerService])
], IngestEdgeEventUseCase);
function sha256Hex(input) {
    return crypto.createHash('sha256').update(input).digest('hex');
}
//# sourceMappingURL=ingest-edge-event.usecase.js.map