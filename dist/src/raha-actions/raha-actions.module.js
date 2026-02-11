"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RahaActionsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const raha_actions_controller_1 = require("./raha-actions.controller");
const raha_actions_service_1 = require("./raha-actions.service");
const ng_edge_device_entity_1 = require("../edge-devices/ng-edge-device.entity");
const circles_module_1 = require("../circles/circles.module");
let RahaActionsModule = class RahaActionsModule {
};
exports.RahaActionsModule = RahaActionsModule;
exports.RahaActionsModule = RahaActionsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([ng_edge_device_entity_1.NgEdgeDevice]),
            circles_module_1.CirclesModule,
        ],
        controllers: [raha_actions_controller_1.RahaActionsController],
        providers: [raha_actions_service_1.RahaActionsService],
        exports: [raha_actions_service_1.RahaActionsService],
    })
], RahaActionsModule);
//# sourceMappingURL=raha-actions.module.js.map