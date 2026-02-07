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
exports.ExecuteActionDto = exports.HumanActionType = void 0;
const class_validator_1 = require("class-validator");
var HumanActionType;
(function (HumanActionType) {
    HumanActionType["RESOLVE"] = "RESOLVE";
    HumanActionType["DISMISS"] = "DISMISS";
    HumanActionType["DISARM"] = "DISARM";
    HumanActionType["MODE_CHANGE"] = "MODE_CHANGE";
    HumanActionType["STOP_SIREN"] = "STOP_SIREN";
})(HumanActionType || (exports.HumanActionType = HumanActionType = {}));
class ExecuteActionDto {
}
exports.ExecuteActionDto = ExecuteActionDto;
__decorate([
    (0, class_validator_1.IsEnum)(HumanActionType),
    __metadata("design:type", String)
], ExecuteActionDto.prototype, "action", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExecuteActionDto.prototype, "eventId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], ExecuteActionDto.prototype, "params", void 0);
//# sourceMappingURL=dto.js.map