"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CirclesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ng_user_entity_1 = require("../auth/ng-user.entity");
const circles_controller_1 = require("./circles.controller");
const circles_service_1 = require("./circles.service");
const ng_circle_entity_1 = require("./ng-circle.entity");
const ng_circle_member_entity_1 = require("./ng-circle-member.entity");
let CirclesModule = class CirclesModule {
};
exports.CirclesModule = CirclesModule;
exports.CirclesModule = CirclesModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([ng_user_entity_1.NgUser, ng_circle_entity_1.NgCircle, ng_circle_member_entity_1.NgCircleMember])],
        controllers: [circles_controller_1.CirclesController],
        providers: [circles_service_1.CirclesService],
        exports: [circles_service_1.CirclesService],
    })
], CirclesModule);
//# sourceMappingURL=circles.module.js.map