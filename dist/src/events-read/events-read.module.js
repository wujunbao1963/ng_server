"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsReadModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const contracts_module_1 = require("../common/contracts/contracts.module");
const ng_event_entity_1 = require("../events-ingest/ng-event.entity");
const ng_event_note_entity_1 = require("../events-collab/ng-event-note.entity");
const ng_evidence_session_entity_1 = require("../evidence/ng-evidence-session.entity");
const ng_event_evidence_entity_1 = require("../evidence/ng-event-evidence.entity");
const events_read_controller_1 = require("./events-read.controller");
const events_read_service_1 = require("./events-read.service");
const circles_module_1 = require("../circles/circles.module");
let EventsReadModule = class EventsReadModule {
};
exports.EventsReadModule = EventsReadModule;
exports.EventsReadModule = EventsReadModule = __decorate([
    (0, common_1.Module)({
        imports: [
            contracts_module_1.ContractsModule,
            circles_module_1.CirclesModule,
            typeorm_1.TypeOrmModule.forFeature([ng_event_entity_1.NgEvent, ng_event_note_entity_1.NgEventNote, ng_evidence_session_entity_1.NgEvidenceSession, ng_event_evidence_entity_1.NgEventEvidence]),
        ],
        controllers: [events_read_controller_1.EventsReadController],
        providers: [events_read_service_1.EventsReadService],
    })
], EventsReadModule);
//# sourceMappingURL=events-read.module.js.map