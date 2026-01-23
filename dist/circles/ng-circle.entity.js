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
exports.NgCircle = void 0;
const typeorm_1 = require("typeorm");
let NgCircle = class NgCircle {
};
exports.NgCircle = NgCircle;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'id', type: 'uuid' }),
    __metadata("design:type", String)
], NgCircle.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'name', type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], NgCircle.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'property_type', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], NgCircle.prototype, "propertyType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'address', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], NgCircle.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'city', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], NgCircle.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'state', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], NgCircle.prototype, "state", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'postal_code', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], NgCircle.prototype, "postalCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'country', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], NgCircle.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'latitude', type: 'double precision', nullable: true }),
    __metadata("design:type", Object)
], NgCircle.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'longitude', type: 'double precision', nullable: true }),
    __metadata("design:type", Object)
], NgCircle.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'proximity_radius_m', type: 'int', default: 50 }),
    __metadata("design:type", Number)
], NgCircle.prototype, "proximityRadiusM", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'settings', type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], NgCircle.prototype, "settings", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], NgCircle.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], NgCircle.prototype, "updatedAt", void 0);
exports.NgCircle = NgCircle = __decorate([
    (0, typeorm_1.Entity)({ name: 'ng_circles' })
], NgCircle);
//# sourceMappingURL=ng-circle.entity.js.map