"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ng_outbox_entity_1 = require("./ng-outbox.entity");
const outbox_service_1 = require("./outbox.service");
const outbox_worker_1 = require("./outbox.worker");
const push_notification_handler_1 = require("./push-notification.handler");
const ng_push_device_entity_1 = require("../../notifications/ng-push-device.entity");
let OutboxModule = class OutboxModule {
};
exports.OutboxModule = OutboxModule;
exports.OutboxModule = OutboxModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([ng_outbox_entity_1.NgOutbox, ng_push_device_entity_1.NgPushDevice]),
        ],
        providers: [
            outbox_service_1.OutboxService,
            outbox_worker_1.OutboxWorker,
            push_notification_handler_1.PushNotificationHandler,
            {
                provide: push_notification_handler_1.OUTBOX_HANDLERS,
                useFactory: (pushHandler) => [pushHandler],
                inject: [push_notification_handler_1.PushNotificationHandler],
            },
        ],
        exports: [outbox_service_1.OutboxService],
    })
], OutboxModule);
//# sourceMappingURL=outbox.module.js.map