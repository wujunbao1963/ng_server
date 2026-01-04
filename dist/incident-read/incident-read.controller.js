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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentReadController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const contracts_validator_service_1 = require("../common/contracts/contracts-validator.service");
const ng_http_error_1 = require("../common/errors/ng-http-error");
const circles_service_1 = require("../circles/circles.service");
const incident_read_service_1 = require("./incident-read.service");
let IncidentReadController = class IncidentReadController {
    constructor(svc, circles, contracts) {
        this.svc = svc;
        this.circles = circles;
        this.contracts = contracts;
    }
    async getManifest(req, circleId, eventId) {
        await this.circles.mustBeMember(req.user.userId, circleId);
        const row = await this.svc.getManifest(circleId, eventId);
        if (!row) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: ng_http_error_1.NgErrorCodes.NOT_FOUND,
                message: 'Incident manifest not found',
                timestamp: new Date().toISOString(),
                retryable: false,
            });
        }
        const response = {
            ok: true,
            circleId,
            eventId,
            edgeInstanceId: row.edgeInstanceId,
            edgeUpdatedAt: row.edgeUpdatedAt.toISOString(),
            sequence: Number(row.lastSequence),
            manifest: row.manifestJson.manifest ?? row.manifestJson,
        };
        const v = this.contracts.validateAppIncidentManifestGetResponse(response);
        if (!v.ok) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 500,
                error: 'Internal Server Error',
                code: ng_http_error_1.NgErrorCodes.INTERNAL,
                message: 'Server response does not match contracts',
                timestamp: new Date().toISOString(),
                details: { schema: 'app.incidentManifest.get.response', errors: v.errors },
                retryable: true,
            });
        }
        return response;
    }
};
exports.IncidentReadController = IncidentReadController;
__decorate([
    (0, common_1.Get)('manifest'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Param)('eventId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], IncidentReadController.prototype, "getManifest", null);
exports.IncidentReadController = IncidentReadController = __decorate([
    (0, common_1.Controller)('/api/circles/:circleId/events/:eventId/incident'),
    __metadata("design:paramtypes", [incident_read_service_1.IncidentReadService,
        circles_service_1.CirclesService,
        contracts_validator_service_1.ContractsValidatorService])
], IncidentReadController);
//# sourceMappingURL=incident-read.controller.js.map