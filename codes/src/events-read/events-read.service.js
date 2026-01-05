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
exports.EventsReadService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ng_event_entity_1 = require("../events-ingest/ng-event.entity");
const ng_event_note_entity_1 = require("../events-collab/ng-event-note.entity");
const ng_evidence_session_entity_1 = require("../evidence/ng-evidence-session.entity");
const ng_event_evidence_entity_1 = require("../evidence/ng-event-evidence.entity");
const ng_http_error_1 = require("../common/errors/ng-http-error");
const cursor_1 = require("./utils/cursor");
let EventsReadService = class EventsReadService {
    constructor(eventsRepo, notesRepo, evidenceSessionsRepo, eventEvidenceRepo) {
        this.eventsRepo = eventsRepo;
        this.notesRepo = notesRepo;
        this.evidenceSessionsRepo = evidenceSessionsRepo;
        this.eventEvidenceRepo = eventEvidenceRepo;
    }
    async list(circleId, limit, cursor) {
        let c;
        if (cursor) {
            try {
                c = (0, cursor_1.decodeCursor)(cursor);
            }
            catch (e) {
                throw new ng_http_error_1.NgHttpError({
                    statusCode: 422,
                    error: 'Unprocessable Entity',
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid cursor',
                    timestamp: new Date().toISOString(),
                    details: { cursor },
                    retryable: false,
                });
            }
        }
        const qb = this.eventsRepo
            .createQueryBuilder('e')
            .where('e.circleId = :circleId', { circleId })
            .orderBy('e.occurredAt', 'DESC')
            .addOrderBy('e.eventId', 'DESC')
            .take(limit + 1);
        if (c) {
            qb.andWhere('(e.occurredAt < :cOcc) OR (e.occurredAt = :cOcc AND e.eventId < :cEventId)', { cOcc: new Date(c.occurredAt), cEventId: c.eventId });
        }
        const rows = await qb.getMany();
        const hasMore = rows.length > limit;
        const page = hasMore ? rows.slice(0, limit) : rows;
        const items = page.map((ev) => this.toSummary(ev));
        let nextCursor = null;
        if (hasMore && page.length > 0) {
            const last = page[page.length - 1];
            nextCursor = (0, cursor_1.encodeCursor)({
                occurredAt: last.occurredAt.toISOString(),
                eventId: last.eventId,
            });
        }
        return { items, nextCursor };
    }
    async get(circleId, eventId) {
        const ev = await this.eventsRepo.findOne({ where: { circleId, eventId } });
        if (!ev) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: 'NOT_FOUND',
                message: 'Event not found',
                timestamp: new Date().toISOString(),
                details: { circleId, eventId },
                retryable: false,
            });
        }
        const notes = await this.notesRepo.find({
            where: { circleId, eventId },
            order: { createdAt: 'ASC' },
        });
        const latestSession = await this.evidenceSessionsRepo.findOne({
            where: { circleId, eventId },
            order: { createdAt: 'DESC' },
        });
        const eventEvidence = await this.eventEvidenceRepo.findOne({
            where: { circleId, eventId },
        });
        return this.toDetail(ev, notes, { latestSession, eventEvidence });
    }
    toSummary(ev) {
        const raw = ev.rawEvent ?? {};
        const out = {
            eventId: ev.eventId,
            occurredAt: ev.occurredAt.toISOString(),
            eventType: ev.eventType,
            severity: ev.severity,
            notificationLevel: ev.notificationLevel,
            status: ev.status,
            title: clamp(ev.title, 120),
        };
        if (typeof raw.zoneId === 'string' && raw.zoneId.length > 0) {
            out.zoneId = raw.zoneId;
        }
        if (typeof raw.entryPointId === 'string' && raw.entryPointId.length > 0) {
            out.entryPointId = raw.entryPointId;
        }
        if (typeof ev.alarmState === 'string' && ev.alarmState.length > 0) {
            out.alarmState = ev.alarmState;
        }
        if (typeof raw.localDisarm === 'boolean') {
            out.localDisarm = raw.localDisarm;
        }
        return out;
    }
    toDetail(ev, notes, evidenceRefs) {
        const raw = ev.rawEvent ?? {};
        const evidence = this.toEvidenceSummary(raw?.evidence ?? null, evidenceRefs);
        const out = {
            eventId: ev.eventId,
            occurredAt: ev.occurredAt.toISOString(),
            eventType: ev.eventType,
            severity: ev.severity,
            notificationLevel: ev.notificationLevel,
            status: ev.status,
            title: clamp(ev.title, 120),
            description: ev.description ? clamp(ev.description, 800) : null,
            serverReceivedAt: ev.receivedAt.toISOString(),
            ackedAt: ev.ackedAt ? ev.ackedAt.toISOString() : null,
            resolvedAt: ev.resolvedAt ? ev.resolvedAt.toISOString() : null,
            trackSummary: raw.trackSummary ?? null,
            explainSummary: ev.explainSummary,
            evidence,
            notes: notes.map((n) => {
                const out = {
                    noteId: n.noteId,
                    createdAt: n.createdAt.toISOString(),
                    text: n.text,
                };
                if (n.createdById) {
                    out.createdById = n.createdById;
                }
                return out;
            }),
        };
        if (typeof raw.zoneId === 'string' && raw.zoneId.length > 0) {
            out.zoneId = raw.zoneId;
        }
        if (typeof raw.entryPointId === 'string' && raw.entryPointId.length > 0) {
            out.entryPointId = raw.entryPointId;
        }
        if (typeof ev.alarmState === 'string' && ev.alarmState.length > 0) {
            out.alarmState = ev.alarmState;
        }
        if (typeof raw.localDisarm === 'boolean') {
            out.localDisarm = raw.localDisarm;
        }
        return out;
    }
    toEvidenceSummary(rawEvidence, refs) {
        if (rawEvidence === null || rawEvidence === undefined) {
            return null;
        }
        const policy = typeof rawEvidence.policy === 'string' ? rawEvidence.policy : 'NONE';
        const available = rawEvidence.available === true;
        if (!available) {
            return { policy, status: 'NONE', evidenceId: null };
        }
        const ee = refs.eventEvidence;
        if (ee) {
            if (ee.evidenceStatus === 'ARCHIVED') {
                return { policy, status: 'ARCHIVED', evidenceId: ee.id };
            }
            if (ee.evidenceStatus === 'FAILED') {
                return { policy, status: 'FAILED', evidenceId: ee.id };
            }
            return { policy, status: 'UPLOADING', evidenceId: ee.id };
        }
        const s = refs.latestSession;
        if (s) {
            if (s.status === 'OPEN') {
                return { policy, status: 'UPLOADING', evidenceId: s.evidenceId ?? null };
            }
            return { policy, status: 'REQUESTED', evidenceId: s.evidenceId ?? null };
        }
        return { policy, status: 'REQUESTED', evidenceId: null };
    }
};
exports.EventsReadService = EventsReadService;
exports.EventsReadService = EventsReadService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_event_entity_1.NgEvent)),
    __param(1, (0, typeorm_1.InjectRepository)(ng_event_note_entity_1.NgEventNote)),
    __param(2, (0, typeorm_1.InjectRepository)(ng_evidence_session_entity_1.NgEvidenceSession)),
    __param(3, (0, typeorm_1.InjectRepository)(ng_event_evidence_entity_1.NgEventEvidence)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], EventsReadService);
function clamp(v, maxLen) {
    if (v.length <= maxLen)
        return v;
    return v.slice(0, maxLen);
}
//# sourceMappingURL=events-read.service.js.map