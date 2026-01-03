"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfraModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const clock_port_1 = require("./clock.port");
const logger_service_1 = require("./logger.service");
const request_id_interceptor_1 = require("./request-id.interceptor");
const push_provider_port_1 = require("./push-provider.port");
let InfraModule = class InfraModule {
};
exports.InfraModule = InfraModule;
exports.InfraModule = InfraModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            {
                provide: clock_port_1.CLOCK_PORT,
                useClass: clock_port_1.SystemClock,
            },
            logger_service_1.NgLoggerService,
            {
                provide: push_provider_port_1.PUSH_PROVIDER_PORT,
                useFactory: (config, logger) => {
                    const mode = config.get('PUSH_PROVIDER_MODE') ?? 'mock';
                    if (mode === 'fcm') {
                        return new push_provider_port_1.FCMPushProvider(logger);
                    }
                    return new push_provider_port_1.MockPushProvider(logger);
                },
                inject: [config_1.ConfigService, logger_service_1.NgLoggerService],
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: request_id_interceptor_1.RequestIdInterceptor,
            },
        ],
        exports: [clock_port_1.CLOCK_PORT, logger_service_1.NgLoggerService, push_provider_port_1.PUSH_PROVIDER_PORT],
    })
], InfraModule);
//# sourceMappingURL=infra.module.js.map