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
var EdgeEventsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdgeEventsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto = require("crypto");
const ng_edge_event_entity_1 = require("./ng-edge-event.entity");
const ng_edge_event_summary_raw_entity_1 = require("./ng-edge-event-summary-raw.entity");
const ng_edge_ingest_audit_entity_1 = require("./ng-edge-ingest-audit.entity");
const stable_json_1 = require("../common/utils/stable-json");
const notifications_service_1 = require("../notifications/notifications.service");
const circles_service_1 = require("../circles/circles.service");
let EdgeEventsService = EdgeEventsService_1 = class EdgeEventsService {
    constructor(rawRepo, edgeRepo, auditRepo, dataSource, notificationsService, circlesService) {
        this.rawRepo = rawRepo;
        this.edgeRepo = edgeRepo;
        this.auditRepo = auditRepo;
        this.dataSource = dataSource;
        this.notificationsService = notificationsService;
        this.circlesService = circlesService;
        this.logger = new common_1.Logger(EdgeEventsService_1.name);
    }
    async listEvents(circleId, limit = 50) {
        const events = await this.edgeRepo.find({
            where: { circleId },
            order: { edgeUpdatedAt: 'DESC' },
            take: limit,
        });
        const items = events.map((ev) => ({
            eventId: ev.eventId,
            edgeInstanceId: ev.edgeInstanceId,
            threatState: ev.threatState,
            triggerReason: ev.triggerReason,
            occurredAt: ev.edgeUpdatedAt.toISOString(),
            updatedAt: ev.edgeUpdatedAt.toISOString(),
            status: this.mapThreatStateToStatus(ev.threatState),
            title: this.generateTitle(ev),
            ...(ev.summaryJson && typeof ev.summaryJson === 'object' ? this.extractSummaryFields(ev.summaryJson) : {}),
        }));
        return { items, nextCursor: null };
    }
    async getEvent(circleId, eventId) {
        const ev = await this.edgeRepo.findOne({ where: { circleId, eventId } });
        if (!ev) {
            return null;
        }
        return {
            eventId: ev.eventId,
            edgeInstanceId: ev.edgeInstanceId,
            threatState: ev.threatState,
            triggerReason: ev.triggerReason,
            occurredAt: ev.edgeUpdatedAt.toISOString(),
            updatedAt: ev.edgeUpdatedAt.toISOString(),
            status: this.mapThreatStateToStatus(ev.threatState),
            title: this.generateTitle(ev),
            summaryJson: ev.summaryJson,
        };
    }
    async updateEventStatus(circleId, eventId, status, note) {
        const ev = await this.edgeRepo.findOne({ where: { circleId, eventId } });
        if (!ev) {
            return null;
        }
        const newThreatState = status === 'RESOLVED' ? 'RESOLVED' :
            status === 'ACKED' ? 'PENDING' : ev.threatState;
        const now = new Date();
        const updated = ev.threatState !== newThreatState;
        if (updated) {
            await this.edgeRepo.update({ circleId, eventId }, {
                threatState: newThreatState,
                edgeUpdatedAt: now,
            });
        }
        return {
            updated,
            eventId,
            status,
            updatedAt: now.toISOString(),
        };
    }
    mapThreatStateToStatus(threatState) {
        if (threatState === 'RESOLVED' || threatState === 'CANCELED')
            return 'RESOLVED';
        if (threatState === 'TRIGGERED')
            return 'OPEN';
        return 'OPEN';
    }
    generateTitle(ev) {
        const reasonMap = {
            'entry_delay_expired': '入侵警报',
            'motion': '移动检测',
            'door_open': '门窗打开',
            'glass_break': '玻璃破碎',
            'delivery_detected': '📦 快递到达',
        };
        return reasonMap[ev.triggerReason || ''] || '安全事件';
    }
    extractSummaryFields(summary) {
        const fields = {};
        if (summary.entryPointId)
            fields.entryPointId = summary.entryPointId;
        if (summary.mode)
            fields.mode = summary.mode;
        if (summary.workflowClass)
            fields.workflowClass = summary.workflowClass;
        if (summary.zoneId)
            fields.zoneId = summary.zoneId;
        return fields;
    }
    async storeSummaryUpsert(payload) {
        const incomingSeq = typeof payload.sequence === 'number' ? payload.sequence : 0;
        const incomingUpdatedAt = new Date(payload.updatedAt);
        const payloadHash = sha256Hex((0, stable_json_1.stableStringify)(payload));
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
                return { applied: true, reason: 'applied' };
            }
            const storedSeq = Number(existing.lastSequence ?? '0');
            if (incomingSeq === storedSeq && existing.lastPayloadHash && existing.lastPayloadHash === payloadHash) {
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
                return { applied: false, reason: 'duplicate_payload' };
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
                return { applied: false, reason: 'stale_sequence' };
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
                    return { applied: false, reason: 'stale_timestamp' };
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
            return { applied: true, reason: 'applied' };
        });
        if (result.applied) {
            await this.maybeCreateNotification(payload);
        }
        return result;
    }
    async maybeCreateNotification(payload) {
        const workflowClass = payload.workflowClass;
        const triggerReason = payload.triggerReason;
        const threatState = payload.threatState;
        this.logger.debug(`maybeCreateNotification: eventId=${payload.eventId} workflowClass=${workflowClass} threatState=${threatState}`);
        try {
            const ownerUserId = await this.circlesService.getCircleOwner(payload.circleId);
            if (!ownerUserId) {
                this.logger.log(`No owner found for circle ${payload.circleId}, skipping notification`);
                return;
            }
            if (workflowClass === 'LOGISTICS' && triggerReason === 'delivery_detected') {
                await this.notificationsService.createParcelNotification({
                    userId: ownerUserId,
                    circleId: payload.circleId,
                    eventId: payload.eventId,
                    edgeInstanceId: payload.edgeInstanceId,
                    entryPointId: payload.entryPointId,
                });
                this.logger.log(`Created parcel notification for event ${payload.eventId}`);
                return;
            }
            const isSecurityWorkflow = workflowClass?.startsWith('SECURITY');
            const notifiableStates = ['TRIGGERED', 'PENDING', 'PRE', 'PRE_L1', 'PRE_L2', 'PRE_L3'];
            if (isSecurityWorkflow || (threatState && notifiableStates.includes(threatState))) {
                if (threatState && notifiableStates.includes(threatState)) {
                    await this.notificationsService.createSecurityNotification({
                        userId: ownerUserId,
                        circleId: payload.circleId,
                        eventId: payload.eventId,
                        edgeInstanceId: payload.edgeInstanceId,
                        entryPointId: payload.entryPointId,
                        alarmState: threatState,
                        title: payload.title,
                    });
                    this.logger.log(`Created security notification for event ${payload.eventId} threatState=${threatState}`);
                    return;
                }
            }
            this.logger.debug(`No notification needed for event ${payload.eventId}`);
        }
        catch (error) {
            this.logger.error(`Failed to create notification for event ${payload.eventId}`, error instanceof Error ? error.stack : String(error));
        }
    }
};
exports.EdgeEventsService = EdgeEventsService;
exports.EdgeEventsService = EdgeEventsService = EdgeEventsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_edge_event_summary_raw_entity_1.NgEdgeEventSummaryRaw)),
    __param(1, (0, typeorm_1.InjectRepository)(ng_edge_event_entity_1.NgEdgeEvent)),
    __param(2, (0, typeorm_1.InjectRepository)(ng_edge_ingest_audit_entity_1.NgEdgeIngestAudit)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        notifications_service_1.NotificationsService,
        circles_service_1.CirclesService])
], EdgeEventsService);
function sha256Hex(input) {
    return crypto.createHash('sha256').update(input).digest('hex');
}
//# sourceMappingURL=edge-events.service.js.map