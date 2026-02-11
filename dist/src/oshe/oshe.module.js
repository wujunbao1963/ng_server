"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OsheModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ng_oshe_evidence_entity_1 = require("./ng-oshe-evidence.entity");
const ng_circle_entity_1 = require("../circles/ng-circle.entity");
const ng_role_entity_1 = require("../roles/ng-role.entity");
const oshe_service_1 = require("./oshe.service");
const oshe_controller_1 = require("./oshe.controller");
const circles_module_1 = require("../circles/circles.module");
let OsheModule = class OsheModule {
};
exports.OsheModule = OsheModule;
exports.OsheModule = OsheModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([ng_oshe_evidence_entity_1.NgOsheEvidence, ng_circle_entity_1.NgCircle, ng_role_entity_1.NgRole]),
            circles_module_1.CirclesModule,
        ],
        controllers: [oshe_controller_1.OsheController],
        providers: [oshe_service_1.OsheService],
        exports: [oshe_service_1.OsheService],
    })
], OsheModule);
//# sourceMappingURL=oshe.module.js.map