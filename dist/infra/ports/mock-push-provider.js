"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MockPushProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockPushProvider = void 0;
const common_1 = require("@nestjs/common");
let MockPushProvider = MockPushProvider_1 = class MockPushProvider {
    constructor() {
        this.logger = new common_1.Logger(MockPushProvider_1.name);
        this.history = [];
    }
    async send(token, payload) {
        this.logger.log(`[MOCK] Push to ${token.slice(0, 8)}...: ${payload.title}`);
        this.history.push({
            token,
            payload,
            timestamp: new Date(),
        });
        return {
            success: true,
            messageId: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        };
    }
    async sendBatch(tokens, payload) {
        this.logger.log(`[MOCK] Batch push to ${tokens.length} devices: ${payload.title}`);
        const results = [];
        for (const token of tokens) {
            const result = await this.send(token, payload);
            results.push(result);
        }
        return results;
    }
    getHistory() {
        return [...this.history];
    }
    clearHistory() {
        this.history.length = 0;
    }
    getLastPush() {
        return this.history[this.history.length - 1];
    }
};
exports.MockPushProvider = MockPushProvider;
exports.MockPushProvider = MockPushProvider = MockPushProvider_1 = __decorate([
    (0, common_1.Injectable)()
], MockPushProvider);
//# sourceMappingURL=mock-push-provider.js.map