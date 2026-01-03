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
exports.EdgeEventsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ng_edge_event_entity_1 = require("./ng-edge-event.entity");
const logger_service_1 = require("../common/infra/logger.service");
const clock_port_1 = require("../common/infra/clock.port");
const ingest_edge_event_usecase_1 = require("../application/usecases/ingest-edge-event.usecase");
const notifications_service_1 = require("../notifications/notifications.service");
const circles_service_1 = require("../circles/circles.service");
let EdgeEventsService = class EdgeEventsService {
    constructor(edgeRepo, clock, ingestUseCase, notificationsService, circlesService, logger) {
        this.edgeRepo = edgeRepo;
        this.clock = clock;
        this.ingestUseCase = ingestUseCase;
        this.notificationsService = notificationsService;
        this.circlesService = circlesService;
        this.logger = logger.setContext('EdgeEventsService');
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
        const { result, notifications } = await this.ingestUseCase.execute(payload);
        for (const notif of notifications) {
            await this.dispatchNotification(notif);
        }
        return result;
    }
    async dispatchNotification(notif) {
        const logCtx = {
            circleId: notif.circleId,
            eventId: notif.eventId,
            deviceId: notif.edgeInstanceId,
        };
        if (notif.type !== 'PARCEL_DETECTED') {
            this.logger.warn('Unknown notification type, skipping', { ...logCtx, type: notif.type });
            return;
        }
        try {
            const ownerUserId = await this.circlesService.getCircleOwner(notif.circleId);
            if (!ownerUserId) {
                this.logger.log('No owner found for circle, skipping notification', logCtx);
                return;
            }
            await this.notificationsService.createParcelNotification({
                userId: ownerUserId,
                circleId: notif.circleId,
                eventId: notif.eventId,
                edgeInstanceId: notif.edgeInstanceId,
                entryPointId: notif.entryPointId,
            });
            this.logger.log('Parcel notification created', logCtx);
        }
        catch (error) {
            this.logger.error('Failed to create notification', String(error), logCtx);
        }
    }
};
exports.EdgeEventsService = EdgeEventsService;
exports.EdgeEventsService = EdgeEventsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_edge_event_entity_1.NgEdgeEvent)),
    __param(1, (0, common_1.Inject)(clock_port_1.CLOCK_PORT)),
    __metadata("design:paramtypes", [typeorm_2.Repository, Object, ingest_edge_event_usecase_1.IngestEdgeEventUseCase,
        notifications_service_1.NotificationsService,
        circles_service_1.CirclesService,
        logger_service_1.NgLoggerService])
], EdgeEventsService);
//# sourceMappingURL=edge-events.service.js.map