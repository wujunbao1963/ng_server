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
var IncidentManifestsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentManifestsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const crypto = require("crypto");
const typeorm_2 = require("typeorm");
const stable_json_1 = require("../common/utils/stable-json");
const ng_edge_ingest_audit_entity_1 = require("./ng-edge-ingest-audit.entity");
const ng_incident_manifest_entity_1 = require("./ng-incident-manifest.entity");
const ng_incident_manifest_raw_entity_1 = require("./ng-incident-manifest-raw.entity");
let IncidentManifestsService = IncidentManifestsService_1 = class IncidentManifestsService {
    constructor(rawRepo, manifestRepo, auditRepo, dataSource) {
        this.rawRepo = rawRepo;
        this.manifestRepo = manifestRepo;
        this.auditRepo = auditRepo;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(IncidentManifestsService_1.name);
    }
    async storeManifestUpsert(payload) {
        const incomingSeq = typeof payload.sequence === 'number' ? payload.sequence : 0;
        const incomingUpdatedAt = new Date(payload.updatedAt);
        const payloadHash = sha256Hex((0, stable_json_1.stableStringify)(payload));
        return await this.dataSource.transaction(async (manager) => {
            const rawRow = this.rawRepo.create({
                circleId: payload.circleId,
                eventId: payload.eventId,
                edgeInstanceId: payload.edgeInstanceId,
                edgeUpdatedAt: incomingUpdatedAt,
                sequence: String(incomingSeq),
                payload,
            });
            await manager.getRepository(ng_incident_manifest_raw_entity_1.NgIncidentManifestRaw).save(rawRow);
            const repo = manager.getRepository(ng_incident_manifest_entity_1.NgIncidentManifest);
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
                    edgeUpdatedAt: incomingUpdatedAt,
                    lastSequence: String(incomingSeq),
                    lastPayloadHash: payloadHash,
                    manifestJson: payload,
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
                    messageType: 'incident_manifest_upsert',
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
                    messageType: 'incident_manifest_upsert',
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
                    messageType: 'incident_manifest_upsert',
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
                        messageType: 'incident_manifest_upsert',
                    });
                    return { applied: false, reason: 'stale_timestamp' };
                }
            }
            existing.edgeInstanceId = payload.edgeInstanceId;
            existing.edgeUpdatedAt = incomingUpdatedAt;
            existing.lastSequence = String(incomingSeq);
            existing.lastPayloadHash = payloadHash;
            const oldItems = existing.manifestJson?.manifest?.items ?? [];
            const newItems = payload?.manifest?.items ?? [];
            const mergedItems = [...oldItems];
            for (const newItem of newItems) {
                const exists = mergedItems.some(old => (old.edgeUrl && old.edgeUrl === newItem.edgeUrl) ||
                    (old.itemId && old.itemId === newItem.itemId));
                if (!exists) {
                    mergedItems.push(newItem);
                }
            }
            this.logger.log(`eventId=${payload.eventId}: merged ${oldItems.length} old + ${newItems.length} new → ${mergedItems.length} items`);
            const mergedPayload = {
                ...payload,
                manifest: {
                    ...payload.manifest,
                    items: mergedItems,
                },
            };
            existing.manifestJson = mergedPayload;
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
                messageType: 'incident_manifest_upsert',
            });
            return { applied: true, reason: 'applied' };
        });
    }
};
exports.IncidentManifestsService = IncidentManifestsService;
exports.IncidentManifestsService = IncidentManifestsService = IncidentManifestsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_incident_manifest_raw_entity_1.NgIncidentManifestRaw)),
    __param(1, (0, typeorm_1.InjectRepository)(ng_incident_manifest_entity_1.NgIncidentManifest)),
    __param(2, (0, typeorm_1.InjectRepository)(ng_edge_ingest_audit_entity_1.NgEdgeIngestAudit)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], IncidentManifestsService);
function sha256Hex(input) {
    return crypto.createHash('sha256').update(input).digest('hex');
}
//# sourceMappingURL=incident-manifests.service.js.map