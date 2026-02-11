"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsCollabModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const contracts_module_1 = require("../common/contracts/contracts.module");
const ng_event_entity_1 = require("../events-ingest/ng-event.entity");
const ng_event_note_entity_1 = require("./ng-event-note.entity");
const ng_event_status_idempotency_entity_1 = require("./ng-event-status-idempotency.entity");
const events_collab_controller_1 = require("./events-collab.controller");
const events_collab_service_1 = require("./events-collab.service");
const circles_module_1 = require("../circles/circles.module");
let EventsCollabModule = class EventsCollabModule {
};
exports.EventsCollabModule = EventsCollabModule;
exports.EventsCollabModule = EventsCollabModule = __decorate([
    (0, common_1.Module)({
        imports: [
            contracts_module_1.ContractsModule,
            circles_module_1.CirclesModule,
            typeorm_1.TypeOrmModule.forFeature([ng_event_entity_1.NgEvent, ng_event_note_entity_1.NgEventNote, ng_event_status_idempotency_entity_1.NgEventStatusIdempotency]),
        ],
        controllers: [events_collab_controller_1.EventsCollabController],
        providers: [events_collab_service_1.EventsCollabService],
    })
], EventsCollabModule);
//# sourceMappingURL=events-collab.module.js.map