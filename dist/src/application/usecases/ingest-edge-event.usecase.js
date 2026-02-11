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
var IngestEdgeEventUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestEdgeEventUseCase = void 0;
const common_1 = require("@nestjs/common");
const edge_events_service_1 = require("../../edge-events/edge-events.service");
let IngestEdgeEventUseCase = IngestEdgeEventUseCase_1 = class IngestEdgeEventUseCase {
    constructor(edgeEventsService) {
        this.edgeEventsService = edgeEventsService;
        this.logger = new common_1.Logger(IngestEdgeEventUseCase_1.name);
    }
    async execute(input) {
        const { payload, requestId } = input;
        const startTime = Date.now();
        this.logger.log(`Processing event: eventId=${payload.eventId}, circleId=${payload.circleId}, threatState=${payload.threatState}` +
            (requestId ? `, requestId=${requestId}` : ''));
        const result = await this.edgeEventsService.storeSummaryUpsert(payload);
        const duration = Date.now() - startTime;
        this.logger.log(`Event processed: eventId=${payload.eventId}, applied=${result.applied}, reason=${result.reason}, duration=${duration}ms`);
        return {
            ok: true,
            applied: result.applied,
            reason: result.reason,
            serverReceivedAt: new Date().toISOString(),
        };
    }
};
exports.IngestEdgeEventUseCase = IngestEdgeEventUseCase;
exports.IngestEdgeEventUseCase = IngestEdgeEventUseCase = IngestEdgeEventUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [edge_events_service_1.EdgeEventsService])
], IngestEdgeEventUseCase);
//# sourceMappingURL=ingest-edge-event.usecase.js.map