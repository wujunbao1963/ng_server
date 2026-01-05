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
exports.EventsIngestService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto = require("crypto");
const ng_event_entity_1 = require("./ng-event.entity");
const ng_event_idempotency_entity_1 = require("./ng-event-idempotency.entity");
const stable_json_1 = require("../common/utils/stable-json");
const ng_http_error_1 = require("../common/errors/ng-http-error");
let EventsIngestService = class EventsIngestService {
    constructor(dataSource, eventsRepo, idemRepo) {
        this.dataSource = dataSource;
        this.eventsRepo = eventsRepo;
        this.idemRepo = idemRepo;
    }
    async ingest(device, circleId, body) {
        const receivedAt = new Date();
        const initialStatus = body?.event?.status;
        const ackedAt = initialStatus === 'ACKED' ? receivedAt : null;
        const resolvedAt = initialStatus === 'RESOLVED' ? receivedAt : null;
        const payloadHash = sha256Hex((0, stable_json_1.stableStringify)(body.event));
        return this.dataSource.transaction(async (trx) => {
            const idem = await trx.getRepository(ng_event_idempotency_entity_1.NgEventIdempotency).findOne({
                where: {
                    edgeDeviceId: device.id,
                    idempotencyKey: body.idempotencyKey,
                },
            });
            if (idem) {
                if (idem.payloadHash !== payloadHash) {
                    throw new ng_http_error_1.NgHttpError({
                        statusCode: 409,
                        error: 'Conflict',
                        code: ng_http_error_1.NgErrorCodes.IDEMPOTENCY_CONFLICT,
                        message: 'Idempotency key reuse with different payload',
                        timestamp: new Date().toISOString(),
                        details: {
                            idempotencyKey: body.idempotencyKey,
                            existingEventId: idem.eventId,
                        },
                        retryable: false,
                    });
                }
                return {
                    accepted: true,
                    eventId: idem.eventId,
                    serverReceivedAt: receivedAt.toISOString(),
                    deduped: true,
                };
            }
            const eventId = body.event.eventId;
            const existing = await trx.getRepository(ng_event_entity_1.NgEvent).findOne({
                where: { eventId },
            });
            if (existing) {
                const existingHash = sha256Hex((0, stable_json_1.stableStringify)(existing.rawEvent));
                if (existingHash !== payloadHash) {
                    throw new ng_http_error_1.NgHttpError({
                        statusCode: 409,
                        error: 'Conflict',
                        code: ng_http_error_1.NgErrorCodes.EVENT_CONFLICT,
                        message: 'eventId already exists with different payload',
                        timestamp: new Date().toISOString(),
                        details: { eventId },
                        retryable: false,
                    });
                }
                await trx.getRepository(ng_event_idempotency_entity_1.NgEventIdempotency).insert({
                    edgeDeviceId: device.id,
                    idempotencyKey: body.idempotencyKey,
                    eventId,
                    payloadHash,
                });
                return {
                    accepted: true,
                    eventId,
                    serverReceivedAt: receivedAt.toISOString(),
                    deduped: true,
                };
            }
            await trx.getRepository(ng_event_entity_1.NgEvent).insert({
                eventId,
                circleId,
                edgeDeviceId: device.id,
                title: body.event.title,
                description: body.event.description ?? null,
                eventType: body.event.eventType,
                severity: body.event.severity,
                notificationLevel: body.event.notificationLevel,
                status: body.event.status,
                occurredAt: new Date(body.event.occurredAt),
                receivedAt,
                updatedAt: receivedAt,
                ackedAt,
                resolvedAt,
                explainSummary: body.event.explainSummary,
                alarmState: body.event.alarmState ?? null,
                zonesVisited: body.event.trackSummary?.zonesVisited ?? null,
                keySignals: body.event.explainSummary?.keySignals ?? null,
                rawEvent: body.event,
            });
            await trx.getRepository(ng_event_idempotency_entity_1.NgEventIdempotency).insert({
                edgeDeviceId: device.id,
                idempotencyKey: body.idempotencyKey,
                eventId,
                payloadHash,
            });
            return {
                accepted: true,
                eventId,
                serverReceivedAt: receivedAt.toISOString(),
            };
        });
    }
};
exports.EventsIngestService = EventsIngestService;
exports.EventsIngestService = EventsIngestService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(ng_event_entity_1.NgEvent)),
    __param(2, (0, typeorm_1.InjectRepository)(ng_event_idempotency_entity_1.NgEventIdempotency)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        typeorm_2.Repository,
        typeorm_2.Repository])
], EventsIngestService);
function sha256Hex(input) {
    return crypto.createHash('sha256').update(input).digest('hex');
}
//# sourceMappingURL=events-ingest.service.js.map