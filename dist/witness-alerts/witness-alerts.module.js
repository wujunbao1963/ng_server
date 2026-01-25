"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WitnessAlertsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ng_witness_alert_entity_1 = require("./ng-witness-alert.entity");
const witness_alerts_service_1 = require("./witness-alerts.service");
const witness_alerts_controller_1 = require("./witness-alerts.controller");
let WitnessAlertsModule = class WitnessAlertsModule {
};
exports.WitnessAlertsModule = WitnessAlertsModule;
exports.WitnessAlertsModule = WitnessAlertsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([ng_witness_alert_entity_1.NgWitnessAlert]),
        ],
        controllers: [witness_alerts_controller_1.WitnessAlertsController],
        providers: [witness_alerts_service_1.WitnessAlertsService],
        exports: [witness_alerts_service_1.WitnessAlertsService],
    })
], WitnessAlertsModule);
//# sourceMappingURL=witness-alerts.module.js.map