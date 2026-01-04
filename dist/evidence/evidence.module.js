"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const contracts_module_1 = require("../common/contracts/contracts.module");
const device_auth_module_1 = require("../device-auth/device-auth.module");
const ng_event_entity_1 = require("../events-ingest/ng-event.entity");
const evidence_controller_1 = require("./evidence.controller");
const evidence_service_1 = require("./evidence.service");
const evidence_storage_service_1 = require("./evidence-storage.service");
const ng_evidence_item_entity_1 = require("./ng-evidence-item.entity");
const ng_evidence_session_entity_1 = require("./ng-evidence-session.entity");
const ng_event_evidence_entity_1 = require("./ng-event-evidence.entity");
const circles_module_1 = require("../circles/circles.module");
let EvidenceModule = class EvidenceModule {
};
exports.EvidenceModule = EvidenceModule;
exports.EvidenceModule = EvidenceModule = __decorate([
    (0, common_1.Module)({
        imports: [
            contracts_module_1.ContractsModule,
            device_auth_module_1.DeviceAuthModule,
            circles_module_1.CirclesModule,
            typeorm_1.TypeOrmModule.forFeature([ng_event_entity_1.NgEvent, ng_evidence_session_entity_1.NgEvidenceSession, ng_evidence_item_entity_1.NgEvidenceItem, ng_event_evidence_entity_1.NgEventEvidence]),
        ],
        controllers: [evidence_controller_1.EvidenceController],
        providers: [evidence_service_1.EvidenceService, evidence_storage_service_1.EvidenceStorageService],
    })
], EvidenceModule);
//# sourceMappingURL=evidence.module.js.map