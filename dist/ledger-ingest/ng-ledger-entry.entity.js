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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NgLedgerEntry = void 0;
const typeorm_1 = require("typeorm");
let NgLedgerEntry = class NgLedgerEntry {
};
exports.NgLedgerEntry = NgLedgerEntry;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'text' }),
    __metadata("design:type", String)
], NgLedgerEntry.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'text', name: 'edge_instance_id' }),
    __metadata("design:type", String)
], NgLedgerEntry.prototype, "edgeInstanceId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', name: 'circle_id' }),
    __metadata("design:type", String)
], NgLedgerEntry.prototype, "circleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', name: 'ledger_seq' }),
    __metadata("design:type", Number)
], NgLedgerEntry.prototype, "ledgerSeq", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'text', name: 'entry_type' }),
    __metadata("design:type", String)
], NgLedgerEntry.prototype, "entryType", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'text', name: 'event_id', nullable: true }),
    __metadata("design:type", Object)
], NgLedgerEntry.prototype, "eventId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'actor_id', nullable: true }),
    __metadata("design:type", Object)
], NgLedgerEntry.prototype, "actorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'actor_role', nullable: true }),
    __metadata("design:type", Object)
], NgLedgerEntry.prototype, "actorRole", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'device_time' }),
    __metadata("design:type", Date)
], NgLedgerEntry.prototype, "deviceTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', name: 'mono_time', nullable: true }),
    __metadata("design:type", Object)
], NgLedgerEntry.prototype, "monoTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'time_quality', default: 'SYNCED' }),
    __metadata("design:type", String)
], NgLedgerEntry.prototype, "timeQuality", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: () => "'{}'::jsonb" }),
    __metadata("design:type", Object)
], NgLedgerEntry.prototype, "payload", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'contract_version', default: 'ng.edge.server/8.0' }),
    __metadata("design:type", String)
], NgLedgerEntry.prototype, "contractVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'edge_spec_version', default: 'v7.7' }),
    __metadata("design:type", String)
], NgLedgerEntry.prototype, "edgeSpecVersion", void 0);
__decorate([
    (0, typeorm_1.Index)({ unique: true }),
    (0, typeorm_1.Column)({ type: 'text', name: 'idempotency_key' }),
    __metadata("design:type", String)
], NgLedgerEntry.prototype, "idempotencyKey", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'received_at' }),
    __metadata("design:type", Date)
], NgLedgerEntry.prototype, "receivedAt", void 0);
exports.NgLedgerEntry = NgLedgerEntry = __decorate([
    (0, typeorm_1.Entity)({ name: 'ng_ledger_entries' }),
    (0, typeorm_1.Index)(['edgeInstanceId', 'ledgerSeq'], { unique: true })
], NgLedgerEntry);
//# sourceMappingURL=ng-ledger-entry.entity.js.map