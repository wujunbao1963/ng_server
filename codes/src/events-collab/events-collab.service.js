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
exports.EventsCollabService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto = require("crypto");
const ng_event_entity_1 = require("../events-ingest/ng-event.entity");
const ng_event_note_entity_1 = require("./ng-event-note.entity");
const ng_event_status_idempotency_entity_1 = require("./ng-event-status-idempotency.entity");
const stable_json_1 = require("../common/utils/stable-json");
const ng_http_error_1 = require("../common/errors/ng-http-error");
let EventsCollabService = class EventsCollabService {
    constructor(dataSource, eventsRepo, notesRepo, statusIdemRepo) {
        this.dataSource = dataSource;
        this.eventsRepo = eventsRepo;
        this.notesRepo = notesRepo;
        this.statusIdemRepo = statusIdemRepo;
    }
    async updateStatus(circleId, eventId, body) {
        const desiredStatus = body.status;
        const noteText = typeof body.note === 'string' ? body.note : body.note === null ? null : undefined;
        const clientRequestId = body.clientRequestId ?? null;
        const payloadHash = sha256Hex((0, stable_json_1.stableStringify)({ status: desiredStatus, note: noteText ?? null }));
        return this.dataSource.transaction(async (trx) => {
            const events = trx.getRepository(ng_event_entity_1.NgEvent);
            const notes = trx.getRepository(ng_event_note_entity_1.NgEventNote);
            const idems = trx.getRepository(ng_event_status_idempotency_entity_1.NgEventStatusIdempotency);
            const ev = await events.findOne({ where: { circleId, eventId } });
            if (!ev) {
                throw new ng_http_error_1.NgHttpError({
                    statusCode: 404,
                    error: 'Not Found',
                    code: 'EVENT_NOT_FOUND',
                    message: 'Event not found',
                    timestamp: new Date().toISOString(),
                    details: { circleId, eventId },
                    retryable: false,
                });
            }
            if (clientRequestId) {
                const existing = await idems.findOne({
                    where: { eventId, clientRequestId },
                });
                if (existing) {
                    if (existing.payloadHash !== payloadHash) {
                        throw new ng_http_error_1.NgHttpError({
                            statusCode: 409,
                            error: 'Conflict',
                            code: ng_http_error_1.NgErrorCodes.IDEMPOTENCY_CONFLICT,
                            message: 'clientRequestId reuse with different payload',
                            timestamp: new Date().toISOString(),
                            details: { eventId, clientRequestId },
                            retryable: false,
                        });
                    }
                    return {
                        updated: false,
                        eventId,
                        status: existing.status,
                        updatedAt: existing.updatedAt.toISOString(),
                        deduped: true,
                    };
                }
            }
            const from = ev.status;
            const statusChanged = desiredStatus !== from;
            if (statusChanged && !isAllowedTransition(from, desiredStatus)) {
                throw new ng_http_error_1.NgHttpError({
                    statusCode: 409,
                    error: 'Conflict',
                    code: 'EVENT_STATUS_CONFLICT',
                    message: `Invalid status transition: ${from} -> ${desiredStatus}`,
                    timestamp: new Date().toISOString(),
                    details: { from, to: desiredStatus },
                    retryable: false,
                });
            }
            const now = new Date();
            let updatedAt = ev.updatedAt ?? ev.receivedAt;
            const patch = {};
            let bump = false;
            if (statusChanged) {
                patch.status = desiredStatus;
                bump = true;
                if (desiredStatus === 'ACKED' && !ev.ackedAt) {
                    patch.ackedAt = now;
                }
                if (desiredStatus === 'RESOLVED' && !ev.resolvedAt) {
                    patch.resolvedAt = now;
                    if (!ev.ackedAt) {
                        patch.ackedAt = now;
                    }
                }
            }
            if (typeof noteText === 'string' && noteText.trim().length > 0) {
                await notes.insert({
                    noteId: crypto.randomUUID(),
                    eventId,
                    circleId,
                    clientNoteId: null,
                    text: noteText,
                    createdAt: now,
                    createdById: null,
                });
                bump = true;
            }
            if (bump) {
                updatedAt = now;
                patch.updatedAt = updatedAt;
                await events.update({ eventId }, patch);
            }
            if (clientRequestId) {
                await idems.insert({
                    eventId,
                    clientRequestId,
                    payloadHash,
                    status: desiredStatus,
                    updatedAt,
                    createdAt: now,
                });
            }
            return {
                updated: statusChanged,
                eventId,
                status: desiredStatus,
                updatedAt: updatedAt.toISOString(),
            };
        });
    }
    async createNote(circleId, eventId, body) {
        const text = body.text;
        const clientNoteId = body.clientNoteId ?? null;
        return this.dataSource.transaction(async (trx) => {
            const events = trx.getRepository(ng_event_entity_1.NgEvent);
            const notes = trx.getRepository(ng_event_note_entity_1.NgEventNote);
            const ev = await events.findOne({ where: { circleId, eventId } });
            if (!ev) {
                throw new ng_http_error_1.NgHttpError({
                    statusCode: 404,
                    error: 'Not Found',
                    code: 'EVENT_NOT_FOUND',
                    message: 'Event not found',
                    timestamp: new Date().toISOString(),
                    details: { circleId, eventId },
                    retryable: false,
                });
            }
            if (clientNoteId) {
                const existing = await notes.findOne({ where: { circleId, eventId, clientNoteId } });
                if (existing) {
                    if (existing.text !== text) {
                        throw new ng_http_error_1.NgHttpError({
                            statusCode: 409,
                            error: 'Conflict',
                            code: ng_http_error_1.NgErrorCodes.IDEMPOTENCY_CONFLICT,
                            message: 'clientNoteId reuse with different text',
                            timestamp: new Date().toISOString(),
                            details: { eventId, clientNoteId },
                            retryable: false,
                        });
                    }
                    return {
                        created: false,
                        note: {
                            noteId: existing.noteId,
                            createdAt: existing.createdAt.toISOString(),
                            text: existing.text,
                            ...(existing.createdById ? { createdById: existing.createdById } : {}),
                        },
                    };
                }
            }
            const now = new Date();
            const noteId = crypto.randomUUID();
            await notes.insert({
                noteId,
                eventId,
                circleId,
                clientNoteId,
                text,
                createdAt: now,
                createdById: null,
            });
            await events.update({ eventId }, { updatedAt: now });
            return {
                created: true,
                note: {
                    noteId,
                    createdAt: now.toISOString(),
                    text,
                },
            };
        });
    }
};
exports.EventsCollabService = EventsCollabService;
exports.EventsCollabService = EventsCollabService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(ng_event_entity_1.NgEvent)),
    __param(2, (0, typeorm_1.InjectRepository)(ng_event_note_entity_1.NgEventNote)),
    __param(3, (0, typeorm_1.InjectRepository)(ng_event_status_idempotency_entity_1.NgEventStatusIdempotency)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], EventsCollabService);
function sha256Hex(input) {
    return crypto.createHash('sha256').update(input).digest('hex');
}
function isAllowedTransition(from, to) {
    if (from === to)
        return true;
    switch (from) {
        case 'OPEN':
            return to === 'ACKED' || to === 'RESOLVED';
        case 'ACKED':
            return to === 'RESOLVED';
        case 'RESOLVED':
            return false;
        default:
            return false;
    }
}
//# sourceMappingURL=events-collab.service.js.map