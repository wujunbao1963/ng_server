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
var LedgerIngestService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerIngestService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ng_ledger_entry_entity_1 = require("./ng-ledger-entry.entity");
let LedgerIngestService = LedgerIngestService_1 = class LedgerIngestService {
    constructor(repo) {
        this.repo = repo;
        this.logger = new common_1.Logger(LedgerIngestService_1.name);
    }
    async ingestBatch(circleId, batch) {
        const { edgeInstanceId, entries } = batch;
        if (!entries || entries.length === 0) {
            return {
                ok: true,
                ackedSeq: batch.toSeq,
                insertedCount: 0,
                skippedCount: 0,
            };
        }
        let insertedCount = 0;
        let skippedCount = 0;
        let maxSeq = 0;
        const errors = [];
        for (const entry of entries) {
            try {
                const result = await this.ingestEntry(circleId, edgeInstanceId, entry);
                if (result.inserted) {
                    insertedCount++;
                }
                else {
                    skippedCount++;
                }
                if (entry.ledgerSeq > maxSeq) {
                    maxSeq = entry.ledgerSeq;
                }
            }
            catch (err) {
                this.logger.error(`Failed to ingest entry ${entry.idempotencyKey}: ${err}`);
                errors.push(`Entry ${entry.ledgerSeq}: ${err}`);
            }
        }
        await this.updateAckSeq(circleId, edgeInstanceId, maxSeq);
        return {
            ok: errors.length === 0,
            ackedSeq: maxSeq,
            insertedCount,
            skippedCount,
            error: errors.length > 0 ? errors.join('; ') : undefined,
            retryable: false,
        };
    }
    async ingestEntry(circleId, edgeInstanceId, entry) {
        const existing = await this.repo.findOne({
            where: { idempotencyKey: entry.idempotencyKey },
        });
        if (existing) {
            this.logger.debug(`Skipping duplicate entry: ${entry.idempotencyKey}`);
            return { inserted: false };
        }
        const entity = new ng_ledger_entry_entity_1.NgLedgerEntry();
        entity.id = `${edgeInstanceId}:${entry.ledgerSeq}`;
        entity.edgeInstanceId = edgeInstanceId;
        entity.circleId = circleId;
        entity.ledgerSeq = entry.ledgerSeq;
        entity.entryType = entry.entryType;
        entity.eventId = entry.eventId ?? null;
        entity.actorId = entry.actorId ?? null;
        entity.actorRole = entry.actorRole ?? null;
        entity.deviceTime = new Date(entry.deviceTime);
        entity.monoTime = entry.monoTime ?? null;
        entity.timeQuality = entry.timeQuality ?? 'SYNCED';
        entity.payload = entry.payload ?? {};
        entity.contractVersion = entry.contractVersion;
        entity.edgeSpecVersion = entry.edgeSpecVersion;
        entity.idempotencyKey = entry.idempotencyKey;
        await this.repo.save(entity);
        this.logger.debug(`Ingested ledger entry: ${entry.idempotencyKey}`);
        return { inserted: true };
    }
    async getAckSeq(circleId, edgeInstanceId) {
        const result = await this.repo
            .createQueryBuilder('e')
            .select('MAX(e.ledger_seq)', 'maxSeq')
            .where('e.circle_id = :circleId', { circleId })
            .andWhere('e.edge_instance_id = :edgeInstanceId', { edgeInstanceId })
            .getRawOne();
        return result?.maxSeq ?? 0;
    }
    async updateAckSeq(circleId, edgeInstanceId, seq) {
    }
    async getEntriesForEvent(circleId, eventId, limit = 100) {
        return this.repo.find({
            where: { circleId, eventId },
            order: { ledgerSeq: 'ASC' },
            take: limit,
        });
    }
    async getEntriesByType(circleId, entryType, limit = 100) {
        return this.repo.find({
            where: { circleId, entryType },
            order: { ledgerSeq: 'DESC' },
            take: limit,
        });
    }
    async getRecentEntries(circleId, edgeInstanceId, limit = 50) {
        const where = { circleId };
        if (edgeInstanceId) {
            where.edgeInstanceId = edgeInstanceId;
        }
        return this.repo.find({
            where,
            order: { ledgerSeq: 'DESC' },
            take: limit,
        });
    }
};
exports.LedgerIngestService = LedgerIngestService;
exports.LedgerIngestService = LedgerIngestService = LedgerIngestService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_ledger_entry_entity_1.NgLedgerEntry)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], LedgerIngestService);
//# sourceMappingURL=ledger-ingest.service.js.map