"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsIngestModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const contracts_module_1 = require("../common/contracts/contracts.module");
const device_auth_module_1 = require("../device-auth/device-auth.module");
const ng_event_entity_1 = require("./ng-event.entity");
const ng_event_idempotency_entity_1 = require("./ng-event-idempotency.entity");
const events_ingest_controller_1 = require("./events-ingest.controller");
const events_ingest_service_1 = require("./events-ingest.service");
let EventsIngestModule = class EventsIngestModule {
};
exports.EventsIngestModule = EventsIngestModule;
exports.EventsIngestModule = EventsIngestModule = __decorate([
    (0, common_1.Module)({
        imports: [
            contracts_module_1.ContractsModule,
            device_auth_module_1.DeviceAuthModule,
            typeorm_1.TypeOrmModule.forFeature([ng_event_entity_1.NgEvent, ng_event_idempotency_entity_1.NgEventIdempotency]),
        ],
        controllers: [events_ingest_controller_1.EventsIngestController],
        providers: [events_ingest_service_1.EventsIngestService],
    })
], EventsIngestModule);
//# sourceMappingURL=events-ingest.module.js.map