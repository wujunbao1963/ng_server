"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const admin_controller_1 = require("./admin.controller");
const admin_service_1 = require("./admin.service");
const admin_guard_1 = require("./admin.guard");
const admin_maintenance_controller_1 = require("./admin-maintenance.controller");
const ng_user_entity_1 = require("../auth/ng-user.entity");
const ng_circle_entity_1 = require("../circles/ng-circle.entity");
const ng_role_entity_1 = require("../roles/ng-role.entity");
const ng_outbox_entity_1 = require("../common/outbox/ng-outbox.entity");
const ng_notification_entity_1 = require("../notifications/ng-notification.entity");
const ng_push_device_entity_1 = require("../notifications/ng-push-device.entity");
const evidence_tickets_module_1 = require("../evidence-tickets/evidence-tickets.module");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                ng_user_entity_1.NgUser,
                ng_circle_entity_1.NgCircle,
                ng_role_entity_1.NgRole,
                ng_outbox_entity_1.NgOutbox,
                ng_notification_entity_1.NgNotification,
                ng_push_device_entity_1.NgPushDevice,
            ]),
            evidence_tickets_module_1.EvidenceTicketsModule,
        ],
        controllers: [admin_controller_1.AdminController, admin_maintenance_controller_1.AdminMaintenanceController],
        providers: [admin_service_1.AdminService, admin_guard_1.AdminGuard],
        exports: [admin_service_1.AdminService, admin_guard_1.AdminGuard],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map