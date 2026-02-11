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
var CompleteEvidenceUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompleteEvidenceUseCase = void 0;
const common_1 = require("@nestjs/common");
const evidence_service_1 = require("../../evidence/evidence.service");
let CompleteEvidenceUseCase = CompleteEvidenceUseCase_1 = class CompleteEvidenceUseCase {
    constructor(evidenceService) {
        this.evidenceService = evidenceService;
        this.logger = new common_1.Logger(CompleteEvidenceUseCase_1.name);
    }
    async execute(input) {
        const { device, circleId, eventId, sessionId, manifest, reportPackage, requestId } = input;
        const startTime = Date.now();
        this.logger.log(`Completing evidence: sessionId=${sessionId}, eventId=${eventId}, circleId=${circleId}` +
            (requestId ? `, requestId=${requestId}` : ''));
        const result = await this.evidenceService.completeEvidence(device, circleId, eventId, { sessionId, manifest, reportPackage });
        const duration = Date.now() - startTime;
        this.logger.log(`Evidence completed: evidenceId=${result.evidenceId}, deduplicated=${result.deduplicated ?? false}, duration=${duration}ms`);
        return result;
    }
};
exports.CompleteEvidenceUseCase = CompleteEvidenceUseCase;
exports.CompleteEvidenceUseCase = CompleteEvidenceUseCase = CompleteEvidenceUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [evidence_service_1.EvidenceService])
], CompleteEvidenceUseCase);
//# sourceMappingURL=complete-evidence.usecase.js.map