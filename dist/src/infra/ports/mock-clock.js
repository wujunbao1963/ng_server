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
exports.MockClock = void 0;
const common_1 = require("@nestjs/common");
let MockClock = class MockClock {
    constructor(initialTime) {
        this.currentTime = initialTime ?? new Date();
    }
    now() {
        return new Date(this.currentTime);
    }
    isoNow() {
        return this.currentTime.toISOString();
    }
    timestamp() {
        return this.currentTime.getTime();
    }
    setTime(time) {
        this.currentTime = new Date(time);
    }
    advance(milliseconds) {
        this.currentTime = new Date(this.currentTime.getTime() + milliseconds);
    }
    reset() {
        this.currentTime = new Date();
    }
};
exports.MockClock = MockClock;
exports.MockClock = MockClock = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Date])
], MockClock);
//# sourceMappingURL=mock-clock.js.map