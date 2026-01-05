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
var WebPushProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebPushProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const webpush = require("web-push");
let WebPushProvider = WebPushProvider_1 = class WebPushProvider {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(WebPushProvider_1.name);
        this.vapidPublicKey = this.configService.get('VAPID_PUBLIC_KEY') || '';
        this.vapidPrivateKey = this.configService.get('VAPID_PRIVATE_KEY') || '';
        this.vapidSubject = this.configService.get('VAPID_SUBJECT') || 'mailto:admin@example.com';
        if (this.vapidPublicKey && this.vapidPrivateKey) {
            webpush.setVapidDetails(this.vapidSubject, this.vapidPublicKey, this.vapidPrivateKey);
            this.logger.log('WebPushProvider initialized with VAPID keys');
        }
        else {
            this.logger.warn('VAPID keys not configured, Web Push will not work');
        }
    }
    getVapidPublicKey() {
        return this.vapidPublicKey || null;
    }
    isConfigured() {
        return !!(this.vapidPublicKey && this.vapidPrivateKey);
    }
    async sendBatch(tokens, payload) {
        if (!this.isConfigured()) {
            this.logger.warn('Web Push not configured, skipping send');
            return { sent: 0, failed: tokens.length, invalidTokens: [] };
        }
        const results = { sent: 0, failed: 0, invalidTokens: [] };
        const notificationPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            data: payload.data || {},
        });
        for (const token of tokens) {
            try {
                const subscription = JSON.parse(token);
                await webpush.sendNotification(subscription, notificationPayload);
                results.sent++;
                this.logger.debug(`Push sent to ${subscription.endpoint.slice(-20)}`);
            }
            catch (error) {
                results.failed++;
                if (error.statusCode === 410 || error.statusCode === 404) {
                    results.invalidTokens.push(token);
                    this.logger.warn(`Subscription expired: ${token.slice(0, 50)}...`);
                }
                else {
                    this.logger.error(`Push failed: ${error.message}`);
                }
            }
        }
        this.logger.log(`Push batch complete: sent=${results.sent} failed=${results.failed} invalid=${results.invalidTokens.length}`);
        return results;
    }
};
exports.WebPushProvider = WebPushProvider;
exports.WebPushProvider = WebPushProvider = WebPushProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WebPushProvider);
//# sourceMappingURL=web-push-provider.js.map