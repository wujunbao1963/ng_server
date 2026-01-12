"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopoMapModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const device_auth_module_1 = require("../device-auth/device-auth.module");
const contracts_module_1 = require("../common/contracts/contracts.module");
const ng_topomap_entity_1 = require("./ng-topomap.entity");
const topomap_controller_1 = require("./topomap.controller");
const topomap_service_1 = require("./topomap.service");
let TopoMapModule = class TopoMapModule {
};
exports.TopoMapModule = TopoMapModule;
exports.TopoMapModule = TopoMapModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([ng_topomap_entity_1.NgTopoMap]), device_auth_module_1.DeviceAuthModule, contracts_module_1.ContractsModule],
        controllers: [topomap_controller_1.TopoMapController],
        providers: [topomap_service_1.TopoMapService],
        exports: [topomap_service_1.TopoMapService],
    })
], TopoMapModule);
//# sourceMappingURL=topomap.module.js.map