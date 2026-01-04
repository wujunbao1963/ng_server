"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceTicketsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const contracts_module_1 = require("../common/contracts/contracts.module");
const circles_module_1 = require("../circles/circles.module");
const ng_incident_manifest_entity_1 = require("../edge-events/ng-incident-manifest.entity");
const ng_evidence_access_ticket_entity_1 = require("./ng-evidence-access-ticket.entity");
const ng_evidence_download_audit_entity_1 = require("./ng-evidence-download-audit.entity");
const ng_evidence_download_lease_entity_1 = require("./ng-evidence-download-lease.entity");
const evidence_tickets_controller_1 = require("./evidence-tickets.controller");
const evidence_ticket_resolve_controller_1 = require("./evidence-ticket-resolve.controller");
const evidence_ticket_download_controller_1 = require("./evidence-ticket-download.controller");
const evidence_ticket_meta_controller_1 = require("./evidence-ticket-meta.controller");
const evidence_tickets_service_1 = require("./evidence-tickets.service");
let EvidenceTicketsModule = class EvidenceTicketsModule {
};
exports.EvidenceTicketsModule = EvidenceTicketsModule;
exports.EvidenceTicketsModule = EvidenceTicketsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([ng_evidence_access_ticket_entity_1.NgEvidenceAccessTicket, ng_incident_manifest_entity_1.NgIncidentManifest, ng_evidence_download_audit_entity_1.NgEvidenceDownloadAudit, ng_evidence_download_lease_entity_1.NgEvidenceDownloadLease]),
            circles_module_1.CirclesModule,
            contracts_module_1.ContractsModule,
        ],
        controllers: [evidence_tickets_controller_1.EvidenceTicketsController, evidence_ticket_resolve_controller_1.EvidenceTicketResolveController, evidence_ticket_download_controller_1.EvidenceTicketDownloadController, evidence_ticket_meta_controller_1.EvidenceTicketMetaController],
        providers: [evidence_tickets_service_1.EvidenceTicketsService],
        exports: [evidence_tickets_service_1.EvidenceTicketsService],
    })
], EvidenceTicketsModule);
//# sourceMappingURL=evidence-tickets.module.js.map