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
const ports_1 = require("./ports");
let InfraModule = class InfraModule {
};
exports.InfraModule = InfraModule;
exports.InfraModule = InfraModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            {
                provide: ports_1.CLOCK_PORT,
                useClass: ports_1.SystemClock,
            },
            {
                provide: ports_1.PUSH_PROVIDER_PORT,
                useFactory: (config) => {
                    const vapidPublicKey = config.get('VAPID_PUBLIC_KEY');
                    const vapidPrivateKey = config.get('VAPID_PRIVATE_KEY');
                    if (vapidPublicKey && vapidPrivateKey) {
                        return new ports_1.WebPushProvider(config);
                    }
                    console.log('[InfraModule] VAPID keys not set, using MockPushProvider');
                    return new ports_1.MockPushProvider();
                },
                inject: [config_1.ConfigService],
            },
        ],
        exports: [ports_1.CLOCK_PORT, ports_1.PUSH_PROVIDER_PORT],
    })
], InfraModule);
//# sourceMappingURL=infra.module.js.map