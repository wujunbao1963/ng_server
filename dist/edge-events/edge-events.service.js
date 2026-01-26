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
const ng_ledger_entry_entity_1 = require("../ledger-ingest/ng-ledger-entry.entity");
const stable_json_1 = require("../common/utils/stable-json");
const notifications_service_1 = require("../notifications/notifications.service");
const circles_service_1 = require("../circles/circles.service");
const edge_commands_service_1 = require("./edge-commands.service");
const event_viewmodel_service_1 = require("./event-viewmodel.service");
let EdgeEventsService = EdgeEventsService_1 = class EdgeEventsService {
    constructor(rawRepo, edgeRepo, auditRepo, ledgerRepo, dataSource, notificationsService, circlesService, commandsService, viewModelService) {
        this.rawRepo = rawRepo;
        this.edgeRepo = edgeRepo;
        this.auditRepo = auditRepo;
        this.ledgerRepo = ledgerRepo;
        this.dataSource = dataSource;
        this.notificationsService = notificationsService;
        this.circlesService = circlesService;
        this.commandsService = commandsService;
        this.viewModelService = viewModelService;
        this.logger = new common_1.Logger(EdgeEventsService_1.name);
    }
    async listEvents(circleId, limit = 50) {
        const events = await this.edgeRepo.find({
            where: { circleId },
            order: { edgeUpdatedAt: 'DESC' },
            take: limit * 2,
        });
        const filteredEvents = events.filter((ev) => {
            const summary = ev.summaryJson;
            const mode = summary?.mode?.toLowerCase();
            const workflowClass = summary?.workflowClass;
            if (mode !== 'home') {
                return true;
            }
            const isStrongSecurityEvent = ev.threatState === 'TRIGGERED' ||
                ev.triggerReason === 'glass_break';
            const isLogisticsEvent = workflowClass === 'LOGISTICS' &&
                ev.triggerReason === 'delivery_detected';
            if (!isStrongSecurityEvent && !isLogisticsEvent) {
                this.logger.debug(`listEvents: filtering out Home mode event ${ev.eventId} (threatState=${ev.threatState})`);
            }
            return isStrongSecurityEvent || isLogisticsEvent;
        });
        const rawEvents = filteredEvents.slice(0, limit).map((ev) => {
            const summary = ev.summaryJson;
            return {
                eventId: ev.eventId,
                edgeInstanceId: ev.edgeInstanceId,
                threatState: ev.threatState,
                triggerReason: ev.triggerReason,
                edgeUpdatedAt: ev.edgeUpdatedAt,
                summaryJson: summary,
                status: summary?.appStatus,
            };
        });
        const items = await this.viewModelService.toViewModelList(rawEvents, circleId);
        return { items, nextCursor: null };
    }
    async getEvent(circleId, eventId) {
        const ev = await this.edgeRepo.findOne({ where: { circleId, eventId } });
        if (!ev) {
            return null;
        }
        const summary = ev.summaryJson;
        return this.viewModelService.toViewModel({
            eventId: ev.eventId,
            edgeInstanceId: ev.edgeInstanceId,
            threatState: ev.threatState,
            triggerReason: ev.triggerReason,
            edgeUpdatedAt: ev.edgeUpdatedAt,
            summaryJson: summary,
            status: summary?.appStatus,
        }, circleId, { includeDebug: false });
    }
    async updateEventStatus(circleId, eventId, status, note, triggeredByUserId) {
        const ev = await this.edgeRepo.findOne({ where: { circleId, eventId } });
        if (!ev) {
            return null;
        }
        const now = new Date();
        const currentSummary = ev.summaryJson ?? {};
        if (status === 'ACKED') {
            const newSummary = { ...currentSummary, appStatus: 'ACKED' };
            await this.edgeRepo.update({ circleId, eventId }, {
                summaryJson: newSummary,
                edgeUpdatedAt: now,
            });
            return {
                updated: true,
                eventId,
                status,
                updatedAt: now.toISOString(),
            };
        }
        const newThreatState = status === 'RESOLVED' ? 'RESOLVED' : ev.threatState;
        const updated = ev.threatState !== newThreatState;
        if (updated) {
            const newSummary = { ...currentSummary, appStatus: status };
            await this.edgeRepo.update({ circleId, eventId }, {
                threatState: newThreatState,
                summaryJson: newSummary,
                edgeUpdatedAt: now,
            });
        }
        let commandId;
        if (status === 'RESOLVED' && ev.threatState === 'TRIGGERED') {
            try {
                const entryPointId = ev.summaryJson?.entryPointId;
                const command = await this.commandsService.createCommand({
                    circleId,
                    edgeInstanceId: ev.edgeInstanceId,
                    commandType: 'resolve',
                    commandPayload: {
                        eventId,
                        entryPointId,
                    },
                    triggeredByUserId,
                    eventId,
                });
                commandId = command.id;
                this.logger.log(`Created resolve command: ${commandId} for event ${eventId} edge=${ev.edgeInstanceId}`);
            }
            catch (error) {
                this.logger.error(`Failed to create resolve command for event ${eventId}`, error instanceof Error ? error.stack : String(error));
            }
        }
        return {
            updated,
            eventId,
            status,
            updatedAt: now.toISOString(),
            commandId,
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
                const notificationEligible = payload.notificationEligible ?? null;
                const notificationHint = payload.notificationHint;
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
                    notificationEligible,
                    notificationSuppressReason: notificationHint?.suppressReason ?? null,
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
            const notificationEligible = payload.notificationEligible ?? null;
            const notificationHint = payload.notificationHint;
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
                notificationEligible,
                notificationSuppressReason: notificationHint?.suppressReason ?? null,
            });
            return { applied: true, reason: 'applied' };
        });
        if (result.applied) {
            await this.maybeCreateNotification(payload);
            await this.writeLedgerEntry(payload, incomingSeq);
        }
        return result;
    }
    async writeLedgerEntry(payload, sequence) {
        try {
            const idempotencyKey = `${payload.edgeInstanceId}:${payload.eventId}:summary:${sequence}`;
            const existing = await this.ledgerRepo.findOne({
                where: { idempotencyKey },
            });
            if (existing) {
                this.logger.debug(`Ledger entry already exists: ${idempotencyKey}`);
                return;
            }
            const entry = this.ledgerRepo.create({
                id: `${payload.edgeInstanceId}:${sequence}`,
                edgeInstanceId: payload.edgeInstanceId,
                circleId: payload.circleId,
                ledgerSeq: sequence,
                entryType: 'FSM_TRANSITION',
                eventId: payload.eventId,
                actorId: null,
                actorRole: null,
                deviceTime: new Date(payload.updatedAt),
                monoTime: null,
                timeQuality: 'SYNCED',
                payload: {
                    fromState: null,
                    toState: payload.threatState,
                    mode: payload.mode ?? null,
                    reason: payload.triggerReason ?? 'none',
                    entryPointId: payload.entryPointId ?? null,
                    workflowClass: payload.workflowClass ?? null,
                },
                contractVersion: 'ng.edge.server/8.0',
                edgeSpecVersion: payload.schemaVersion,
                idempotencyKey,
            });
            await this.ledgerRepo.save(entry);
            this.logger.log(`Ledger entry created: ${idempotencyKey}`);
        }
        catch (error) {
            this.logger.error(`Failed to write ledger entry for ${payload.eventId}`, error instanceof Error ? error.stack : String(error));
        }
    }
    async maybeCreateNotification(payload) {
        const workflowClass = payload.workflowClass;
        const triggerReason = payload.triggerReason;
        const threatState = payload.threatState;
        const mode = payload.mode;
        const notificationEligible = payload.notificationEligible;
        const notificationHint = payload.notificationHint;
        this.logger.log(`maybeCreateNotification: eventId=${payload.eventId} mode=${mode} workflowClass=${workflowClass} ` +
            `threatState=${threatState} triggerReason=${triggerReason} ` +
            `notificationEligible=${notificationEligible} suppressReason=${notificationHint?.suppressReason}`);
        if (notificationEligible === false) {
            this.logger.log(`Notification suppressed by Edge decision: eventId=${payload.eventId} ` +
                `reason=${notificationHint?.suppressReason || 'EDGE_DECIDED'}`);
            return;
        }
        try {
            const ownerUserId = await this.circlesService.getCircleOwner(payload.circleId);
            if (!ownerUserId) {
                this.logger.log(`No owner found for circle ${payload.circleId}, skipping notification`);
                return;
            }
            if (notificationEligible === undefined) {
                if (mode?.toLowerCase() === 'home') {
                    const isStrongSecurityEvent = threatState === 'TRIGGERED' ||
                        triggerReason === 'glass_break';
                    const isLogisticsEvent = workflowClass === 'LOGISTICS' &&
                        triggerReason === 'delivery_detected';
                    if (!isStrongSecurityEvent && !isLogisticsEvent) {
                        this.logger.log(`[Fallback] Home mode: skipping notification for threatState=${threatState} ` +
                            `triggerReason=${triggerReason} (Edge did not send notificationEligible)`);
                        return;
                    }
                }
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
    __param(3, (0, typeorm_1.InjectRepository)(ng_ledger_entry_entity_1.NgLedgerEntry)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        notifications_service_1.NotificationsService,
        circles_service_1.CirclesService,
        edge_commands_service_1.EdgeCommandsService,
        event_viewmodel_service_1.EventViewModelService])
], EdgeEventsService);
function sha256Hex(input) {
    return crypto.createHash('sha256').update(input).digest('hex');
}
//# sourceMappingURL=edge-events.service.js.map