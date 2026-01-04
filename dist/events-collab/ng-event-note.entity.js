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
exports.NgEventNote = void 0;
const typeorm_1 = require("typeorm");
let NgEventNote = class NgEventNote {
};
exports.NgEventNote = NgEventNote;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'note_id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEventNote.prototype, "noteId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'event_id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEventNote.prototype, "eventId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'circle_id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEventNote.prototype, "circleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'client_note_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], NgEventNote.prototype, "clientNoteId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'text', type: 'text' }),
    __metadata("design:type", String)
], NgEventNote.prototype, "text", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], NgEventNote.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], NgEventNote.prototype, "createdById", void 0);
exports.NgEventNote = NgEventNote = __decorate([
    (0, typeorm_1.Entity)({ name: 'ng_event_notes' })
], NgEventNote);
//# sourceMappingURL=ng-event-note.entity.js.map