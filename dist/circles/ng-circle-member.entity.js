"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NgCircleMember = void 0;
const typeorm_1 = require("typeorm");
let NgCircleMember = class NgCircleMember {
};
exports.NgCircleMember = NgCircleMember;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('increment'),
    __metadata("design:type", Number)
], NgCircleMember.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'circle_id' }),
    __metadata("design:type", String)
], NgCircleMember.prototype, "circleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'user_id' }),
    __metadata("design:type", String)
], NgCircleMember.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'role', type: 'text' }),
    __metadata("design:type", String)
], NgCircleMember.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }),
    __metadata("design:type", Date)
], NgCircleMember.prototype, "createdAt", void 0);
exports.NgCircleMember = NgCircleMember = __decorate([
    (0, typeorm_1.Entity)({ name: 'ng_circle_members' }),
    (0, typeorm_1.Index)(['circleId', 'userId'], { unique: true })
], NgCircleMember);
//# sourceMappingURL=ng-circle-member.entity.js.map