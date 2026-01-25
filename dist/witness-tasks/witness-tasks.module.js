"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WitnessTasksModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ng_witness_task_entity_1 = require("./ng-witness-task.entity");
const ng_circle_entity_1 = require("../circles/ng-circle.entity");
const ng_role_entity_1 = require("../roles/ng-role.entity");
const ng_user_entity_1 = require("../auth/ng-user.entity");
const witness_tasks_service_1 = require("./witness-tasks.service");
const witness_tasks_controller_1 = require("./witness-tasks.controller");
const circles_module_1 = require("../circles/circles.module");
const witness_alerts_module_1 = require("../witness-alerts/witness-alerts.module");
let WitnessTasksModule = class WitnessTasksModule {
};
exports.WitnessTasksModule = WitnessTasksModule;
exports.WitnessTasksModule = WitnessTasksModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([ng_witness_task_entity_1.NgWitnessTask, ng_circle_entity_1.NgCircle, ng_role_entity_1.NgRole, ng_user_entity_1.NgUser]),
            circles_module_1.CirclesModule,
            witness_alerts_module_1.WitnessAlertsModule,
        ],
        controllers: [witness_tasks_controller_1.WitnessTasksController],
        providers: [witness_tasks_service_1.WitnessTasksService],
        exports: [witness_tasks_service_1.WitnessTasksService],
    })
], WitnessTasksModule);
//# sourceMappingURL=witness-tasks.module.js.map