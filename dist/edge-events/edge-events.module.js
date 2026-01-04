"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdgeEventsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const contracts_validator_service_1 = require("../common/contracts/contracts-validator.service");
const device_auth_module_1 = require("../device-auth/device-auth.module");
const circles_module_1 = require("../circles/circles.module");
const notifications_module_1 = require("../notifications/notifications.module");
const ng_edge_event_entity_1 = require("./ng-edge-event.entity");
const ng_edge_ingest_audit_entity_1 = require("./ng-edge-ingest-audit.entity");
const ng_edge_event_summary_raw_entity_1 = require("./ng-edge-event-summary-raw.entity");
const ng_incident_manifest_entity_1 = require("./ng-incident-manifest.entity");
const ng_incident_manifest_raw_entity_1 = require("./ng-incident-manifest-raw.entity");
const edge_events_controller_1 = require("./edge-events.controller");
const edge_events_service_1 = require("./edge-events.service");
const incident_manifests_service_1 = require("./incident-manifests.service");
let EdgeEventsModule = class EdgeEventsModule {
};
exports.EdgeEventsModule = EdgeEventsModule;
exports.EdgeEventsModule = EdgeEventsModule = __decorate([
    (0, common_1.Module)({
        imports: [device_auth_module_1.DeviceAuthModule, circles_module_1.CirclesModule, notifications_module_1.NotificationsModule, typeorm_1.TypeOrmModule.forFeature([ng_edge_event_summary_raw_entity_1.NgEdgeEventSummaryRaw, ng_edge_event_entity_1.NgEdgeEvent, ng_edge_ingest_audit_entity_1.NgEdgeIngestAudit, ng_incident_manifest_raw_entity_1.NgIncidentManifestRaw, ng_incident_manifest_entity_1.NgIncidentManifest])],
        controllers: [edge_events_controller_1.EdgeEventsController],
        providers: [edge_events_service_1.EdgeEventsService, incident_manifests_service_1.IncidentManifestsService, contracts_validator_service_1.ContractsValidatorService],
    })
], EdgeEventsModule);
//# sourceMappingURL=edge-events.module.js.map