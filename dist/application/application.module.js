"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ingest_edge_event_usecase_1 = require("./usecases/ingest-edge-event.usecase");
const complete_evidence_usecase_1 = require("./usecases/complete-evidence.usecase");
const create_upload_session_usecase_1 = require("./usecases/create-upload-session.usecase");
const ng_edge_event_entity_1 = require("../edge-events/ng-edge-event.entity");
const ng_edge_event_summary_raw_entity_1 = require("../edge-events/ng-edge-event-summary-raw.entity");
const ng_edge_ingest_audit_entity_1 = require("../edge-events/ng-edge-ingest-audit.entity");
const ng_event_entity_1 = require("../events-ingest/ng-event.entity");
const ng_evidence_session_entity_1 = require("../evidence/ng-evidence-session.entity");
const ng_evidence_item_entity_1 = require("../evidence/ng-evidence-item.entity");
const ng_event_evidence_entity_1 = require("../evidence/ng-event-evidence.entity");
let ApplicationModule = class ApplicationModule {
};
exports.ApplicationModule = ApplicationModule;
exports.ApplicationModule = ApplicationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                ng_edge_event_entity_1.NgEdgeEvent,
                ng_edge_event_summary_raw_entity_1.NgEdgeEventSummaryRaw,
                ng_edge_ingest_audit_entity_1.NgEdgeIngestAudit,
                ng_event_entity_1.NgEvent,
                ng_evidence_session_entity_1.NgEvidenceSession,
                ng_evidence_item_entity_1.NgEvidenceItem,
                ng_event_evidence_entity_1.NgEventEvidence,
            ]),
        ],
        providers: [
            ingest_edge_event_usecase_1.IngestEdgeEventUseCase,
            complete_evidence_usecase_1.CompleteEvidenceUseCase,
            create_upload_session_usecase_1.CreateUploadSessionUseCase,
        ],
        exports: [
            ingest_edge_event_usecase_1.IngestEdgeEventUseCase,
            complete_evidence_usecase_1.CompleteEvidenceUseCase,
            create_upload_session_usecase_1.CreateUploadSessionUseCase,
        ],
    })
], ApplicationModule);
//# sourceMappingURL=application.module.js.map