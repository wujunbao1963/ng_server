"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLOCK_PORT = exports.MockClock = exports.SystemClock = void 0;
const common_1 = require("@nestjs/common");
let SystemClock = class SystemClock {
    now() {
        return new Date();
    }
    isoNow() {
        return new Date().toISOString();
    }
    after(seconds) {
        return new Date(Date.now() + seconds * 1000);
    }
    isoAfter(seconds) {
        return new Date(Date.now() + seconds * 1000).toISOString();
    }
};
exports.SystemClock = SystemClock;
exports.SystemClock = SystemClock = __decorate([
    (0, common_1.Injectable)()
], SystemClock);
class MockClock {
    constructor(fixedTime) {
        this.currentTime = fixedTime ? new Date(fixedTime) : new Date();
    }
    now() {
        return new Date(this.currentTime);
    }
    isoNow() {
        return this.currentTime.toISOString();
    }
    after(seconds) {
        return new Date(this.currentTime.getTime() + seconds * 1000);
    }
    isoAfter(seconds) {
        return new Date(this.currentTime.getTime() + seconds * 1000).toISOString();
    }
    setTime(time) {
        this.currentTime = new Date(time);
    }
    advance(seconds) {
        this.currentTime = new Date(this.currentTime.getTime() + seconds * 1000);
    }
}
exports.MockClock = MockClock;
exports.CLOCK_PORT = Symbol('CLOCK_PORT');
//# sourceMappingURL=clock.port.js.map