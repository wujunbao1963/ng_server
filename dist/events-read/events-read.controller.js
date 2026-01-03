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
exports.EventsReadController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const contracts_validator_service_1 = require("../common/contracts/contracts-validator.service");
const ng_http_error_1 = require("../common/errors/ng-http-error");
const events_read_service_1 = require("./events-read.service");
const list_events_query_dto_1 = require("./dto/list-events.query.dto");
const circles_service_1 = require("../circles/circles.service");
let EventsReadController = class EventsReadController {
    constructor(svc, contracts, circles) {
        this.svc = svc;
        this.contracts = contracts;
        this.circles = circles;
    }
    async list(req, circleId, query) {
        await this.circles.mustBeMember(req.user.userId, circleId);
        const limit = query.limit ?? 50;
        const result = await this.svc.list(circleId, limit, query.cursor);
        const v = this.contracts.validateEventsListResponse(result);
        if (!v.ok) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 500,
                error: 'Internal Server Error',
                code: ng_http_error_1.NgErrorCodes.INTERNAL,
                message: 'Server response does not match contracts',
                timestamp: new Date().toISOString(),
                details: { schema: 'events.list.response', errors: v.errors },
                retryable: true,
            });
        }
        return result;
    }
    async get(req, circleId, eventId) {
        await this.circles.mustBeMember(req.user.userId, circleId);
        const result = await this.svc.get(circleId, eventId);
        const v = this.contracts.validateEventsGetResponse(result);
        if (!v.ok) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 500,
                error: 'Internal Server Error',
                code: ng_http_error_1.NgErrorCodes.INTERNAL,
                message: 'Server response does not match contracts',
                timestamp: new Date().toISOString(),
                details: { schema: 'events.get.response', errors: v.errors },
                retryable: true,
            });
        }
        return result;
    }
};
exports.EventsReadController = EventsReadController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, list_events_query_dto_1.ListEventsQueryDto]),
    __metadata("design:returntype", Promise)
], EventsReadController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':eventId'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Param)('eventId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], EventsReadController.prototype, "get", null);
exports.EventsReadController = EventsReadController = __decorate([
    (0, common_1.Controller)('/api/circles/:circleId/events'),
    __metadata("design:paramtypes", [events_read_service_1.EventsReadService,
        contracts_validator_service_1.ContractsValidatorService,
        circles_service_1.CirclesService])
], EventsReadController);
//# sourceMappingURL=events-read.controller.js.map