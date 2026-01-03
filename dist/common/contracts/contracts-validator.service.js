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
exports.ContractsValidatorService = void 0;
const common_1 = require("@nestjs/common");
const _2020_1 = require("ajv/dist/2020");
const ajv_formats_1 = require("ajv-formats");
const fs = require("fs");
const path = require("path");
let ContractsValidatorService = class ContractsValidatorService {
    constructor() {
        this.ajv = new _2020_1.default({
            strict: false,
            allErrors: true,
            allowUnionTypes: true,
        });
        (0, ajv_formats_1.default)(this.ajv, ['date-time', 'uuid', 'uri']);
        this.loadSchemas();
        this.validateIngestReq = this.mustGetSchema('https://neighborguard.dev/contracts/v1/events.ingest.request.schema.json');
        this.validateEventsListResp = this.mustGetSchema('https://neighborguard.dev/contracts/v1/events.list.response.schema.json');
        this.validateEventsGetResp = this.mustGetSchema('https://neighborguard.dev/contracts/v1/events.get.response.schema.json');
        this.validateStatusUpdateReq = this.mustGetSchema('https://neighborguard.dev/contracts/v1/events.status.update.request.schema.json');
        this.validateStatusUpdateResp = this.mustGetSchema('https://neighborguard.dev/contracts/v1/events.status.update.response.schema.json');
        this.validateNotesCreateReq = this.mustGetSchema('https://neighborguard.dev/contracts/v1/events.notes.create.request.schema.json');
        this.validateNotesCreateResp = this.mustGetSchema('https://neighborguard.dev/contracts/v1/events.notes.create.response.schema.json');
        this.validateTopoMapFn = this.mustGetSchema('https://neighborguard.dev/contracts/v1/topomap.schema.json');
        this.validateTopoMapReq = this.mustGetSchema('https://neighborguard.dev/contracts/v1/topomap.schema.json');
        this.validateTopoMapResp = this.validateTopoMapReq;
        this.validateDeviceRegisterReq = this.mustGetSchema('https://neighborguard.dev/contracts/v1/device.register.request.schema.json');
        this.validateDeviceRegisterResp = this.mustGetSchema('https://neighborguard.dev/contracts/v1/device.register.response.schema.json');
        this.validateEdgeEventSummaryUpsertReq = this.mustGetSchema('https://neighborguard.dev/contracts/v7.7/edge.eventSummaryUpsert.schema.json');
        this.validateEdgeIncidentManifestUpsertReq = this.mustGetSchema('https://neighborguard.dev/contracts/v7.7/edge.incidentManifestUpsert.schema.json');
        this.validateAppIncidentManifestGetResp = this.mustGetSchema('https://neighborguard.dev/contracts/v7.7/app.incidentManifest.get.response.schema.json');
        this.validateAppEvidenceTicketCreateReq = this.mustGetSchema('https://neighborguard.dev/contracts/v7.7/app.evidenceTicket.create.request.schema.json');
        this.validateAppEvidenceTicketCreateResp = this.mustGetSchema('https://neighborguard.dev/contracts/v7.7/app.evidenceTicket.create.response.schema.json');
        this.validateAppEvidenceTicketResolveResp = this.mustGetSchema('https://neighborguard.dev/contracts/v7.7/app.evidenceTicket.resolve.response.schema.json');
        this.validateAppEvidenceTicketMetaResp = this.mustGetSchema('https://neighborguard.dev/contracts/v7.7/app.evidenceTicket.meta.response.schema.json');
    }
    validateEventsIngestRequest(body) {
        const ok = this.validateIngestReq(body);
        if (ok)
            return { ok: true };
        return { ok: false, errors: this.validateIngestReq.errors ?? [] };
    }
    validateEventsListResponse(body) {
        const ok = this.validateEventsListResp(body);
        if (ok)
            return { ok: true };
        return { ok: false, errors: this.validateEventsListResp.errors ?? [] };
    }
    validateEventsGetResponse(body) {
        const ok = this.validateEventsGetResp(body);
        if (ok)
            return { ok: true };
        return { ok: false, errors: this.validateEventsGetResp.errors ?? [] };
    }
    validateStatusUpdateRequest(body) {
        const ok = this.validateStatusUpdateReq(body);
        if (ok)
            return { ok: true };
        return { ok: false, errors: this.validateStatusUpdateReq.errors ?? [] };
    }
    validateStatusUpdateResponse(body) {
        const ok = this.validateStatusUpdateResp(body);
        if (ok)
            return { ok: true };
        return { ok: false, errors: this.validateStatusUpdateResp.errors ?? [] };
    }
    validateNotesCreateRequest(body) {
        const ok = this.validateNotesCreateReq(body);
        if (ok)
            return { ok: true };
        return { ok: false, errors: this.validateNotesCreateReq.errors ?? [] };
    }
    validateNotesCreateResponse(body) {
        const ok = this.validateNotesCreateResp(body);
        if (ok)
            return { ok: true };
        return { ok: false, errors: this.validateNotesCreateResp.errors ?? [] };
    }
    validateDeviceRegisterRequest(body) {
        const ok = this.validateDeviceRegisterReq(body);
        if (ok)
            return { ok: true };
        return { ok: false, errors: this.validateDeviceRegisterReq.errors ?? [] };
    }
    validateDeviceRegisterResponse(body) {
        const ok = this.validateDeviceRegisterResp(body);
        if (ok)
            return { ok: true };
        return { ok: false, errors: this.validateDeviceRegisterResp.errors ?? [] };
    }
    validateAppIncidentManifestGetResponse(body) {
        const ok = this.validateAppIncidentManifestGetResp(body);
        if (ok)
            return { ok: true };
        return { ok: false, errors: this.validateAppIncidentManifestGetResp.errors ?? [] };
    }
    validateAppEvidenceTicketCreateRequest(body) {
        const ok = this.validateAppEvidenceTicketCreateReq(body);
        if (ok)
            return { ok: true };
        return { ok: false, errors: this.validateAppEvidenceTicketCreateReq.errors ?? [] };
    }
    validateAppEvidenceTicketCreateResponse(body) {
        const ok = this.validateAppEvidenceTicketCreateResp(body);
        if (ok)
            return { ok: true };
        return { ok: false, errors: this.validateAppEvidenceTicketCreateResp.errors ?? [] };
    }
    validateAppEvidenceTicketResolveResponse(body) {
        const ok = this.validateAppEvidenceTicketResolveResp(body);
        if (ok)
            return { ok: true };
        return { ok: false, errors: this.validateAppEvidenceTicketResolveResp.errors ?? [] };
    }
    validateAppEvidenceTicketMetaResponse(body) {
        const ok = this.validateAppEvidenceTicketMetaResp(body);
        if (ok)
            return { ok: true };
        return { ok: false, errors: this.validateAppEvidenceTicketMetaResp.errors ?? [] };
    }
    validateTopoMapRequest(body) {
        const ok = this.validateTopoMapReq(body);
        if (ok)
            return { ok: true };
        return { ok: false, errors: this.validateTopoMapReq.errors ?? [] };
    }
    validateTopoMapResponse(body) {
        const ok = this.validateTopoMapResp(body);
        if (ok)
            return { ok: true };
        return { ok: false, errors: this.validateTopoMapResp.errors ?? [] };
    }
    validateEvidenceUploadSessionRequest(body) {
        const fn = this.mustGetSchema('https://neighborguard.dev/contracts/v1/evidence.uploadSession.request.schema.json');
        const ok = fn(body);
        return ok ? { ok: true } : { ok: false, errors: fn.errors ?? [] };
    }
    validateEvidenceUploadSessionResponse(body) {
        const fn = this.mustGetSchema('https://neighborguard.dev/contracts/v1/evidence.uploadSession.response.schema.json');
        const ok = fn(body);
        return ok ? { ok: true } : { ok: false, errors: fn.errors ?? [] };
    }
    validateEvidenceCompleteRequest(body) {
        const fn = this.mustGetSchema('https://neighborguard.dev/contracts/v1/evidence.complete.request.schema.json');
        const ok = fn(body);
        return ok ? { ok: true } : { ok: false, errors: fn.errors ?? [] };
    }
    validateEvidenceCompleteResponse(body) {
        const fn = this.mustGetSchema('https://neighborguard.dev/contracts/v1/evidence.complete.response.schema.json');
        const ok = fn(body);
        return ok ? { ok: true } : { ok: false, errors: fn.errors ?? [] };
    }
    validateEvidenceGetResponse(body) {
        const fn = this.mustGetSchema('https://neighborguard.dev/contracts/v1/evidence.get.response.schema.json');
        const ok = fn(body);
        return ok ? { ok: true } : { ok: false, errors: fn.errors ?? [] };
    }
    validateEvidenceDownloadUrlResponse(body) {
        const fn = this.mustGetSchema('https://neighborguard.dev/contracts/v1/evidence.downloadUrl.response.schema.json');
        const ok = fn(body);
        return ok ? { ok: true } : { ok: false, errors: fn.errors ?? [] };
    }
    validateTopoMap(body) {
        const ok = this.validateTopoMapFn(body);
        if (ok)
            return { ok: true };
        return { ok: false, errors: this.validateTopoMapFn.errors ?? [] };
    }
    validate(fn, body) {
        const ok = fn(body);
        if (ok)
            return { ok: true };
        return { ok: false, errors: fn.errors ?? [] };
    }
    mustGetSchema(schemaId) {
        const fn = this.ajv.getSchema(schemaId);
        if (!fn) {
            throw new Error(`Failed to compile schema: ${schemaId}`);
        }
        return fn;
    }
    validateEdgeEventSummaryUpsertRequest(body) {
        const ok = this.validateEdgeEventSummaryUpsertReq(body);
        if (ok)
            return { ok: true };
        return { ok: false, errors: this.validateEdgeEventSummaryUpsertReq.errors ?? [] };
    }
    validateEdgeIncidentManifestUpsertRequest(body) {
        const ok = this.validateEdgeIncidentManifestUpsertReq(body);
        if (ok)
            return { ok: true };
        return { ok: false, errors: this.validateEdgeIncidentManifestUpsertReq.errors ?? [] };
    }
    loadSchemas() {
        const roots = [
            path.join(process.cwd(), 'contracts', 'ng-contracts-v1', 'schemas'),
            path.join(process.cwd(), 'contracts', 'ng-contracts-v7.7', 'schemas'),
        ];
        for (const base of roots) {
            if (!fs.existsSync(base))
                continue;
            const files = fs
                .readdirSync(base)
                .filter((f) => f.endsWith('.json'))
                .sort();
            for (const f of files) {
                const p = path.join(base, f);
                const raw = fs.readFileSync(p, 'utf-8');
                const json = JSON.parse(raw);
                this.ajv.addSchema(json);
            }
        }
    }
    getAjv() {
        return this.ajv;
    }
};
exports.ContractsValidatorService = ContractsValidatorService;
exports.ContractsValidatorService = ContractsValidatorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ContractsValidatorService);
//# sourceMappingURL=contracts-validator.service.js.map