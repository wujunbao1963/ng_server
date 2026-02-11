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
    async send(token, payload) {
        if (!this.isConfigured()) {
            return { success: false, error: 'Web Push not configured' };
        }
        const notificationPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            data: payload.data || {},
        });
        try {
            const subscription = JSON.parse(token);
            const response = await webpush.sendNotification(subscription, notificationPayload);
            this.logger.debug(`Push sent to ${subscription.endpoint.slice(-20)}`);
            return { success: true, messageId: response.headers?.['message-id'] || 'sent' };
        }
        catch (error) {
            if (error.statusCode === 410 || error.statusCode === 404) {
                this.logger.warn(`Subscription expired: ${token.slice(0, 50)}...`);
                return { success: false, error: 'Subscription expired', shouldRemoveToken: true };
            }
            this.logger.error(`Push failed: ${error.message}`);
            return { success: false, error: error.message, errorCode: String(error.statusCode) };
        }
    }
    async sendBatch(tokens, payload) {
        if (!this.isConfigured()) {
            this.logger.warn('Web Push not configured, skipping send');
            return tokens.map(() => ({ success: false, error: 'Web Push not configured' }));
        }
        const results = [];
        for (const token of tokens) {
            const result = await this.send(token, payload);
            results.push(result);
        }
        const sent = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        this.logger.log(`Push batch complete: sent=${sent} failed=${failed}`);
        return results;
    }
};
exports.WebPushProvider = WebPushProvider;
exports.WebPushProvider = WebPushProvider = WebPushProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WebPushProvider);
//# sourceMappingURL=web-push-provider.js.map