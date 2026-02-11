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
const config_1 = require("@nestjs/config");
const web_push_provider_1 = require("./ports/web-push-provider");
const apns_push_provider_1 = require("./ports/apns-push-provider");
const multi_push_provider_1 = require("./ports/multi-push-provider");
const push_provider_port_1 = require("./ports/push-provider.port");
let InfraModule = class InfraModule {
};
exports.InfraModule = InfraModule;
exports.InfraModule = InfraModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            web_push_provider_1.WebPushProvider,
            apns_push_provider_1.APNsPushProvider,
            {
                provide: push_provider_port_1.PUSH_PROVIDER_PORT,
                useFactory: (webPush, apns) => {
                    return new multi_push_provider_1.MultiPushProvider(webPush, apns);
                },
                inject: [web_push_provider_1.WebPushProvider, apns_push_provider_1.APNsPushProvider],
            },
        ],
        exports: [push_provider_port_1.PUSH_PROVIDER_PORT, web_push_provider_1.WebPushProvider, apns_push_provider_1.APNsPushProvider],
    })
], InfraModule);
//# sourceMappingURL=infra.module.js.map