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
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(WebPushProvider_1.name);
        const publicKey = this.config.get('VAPID_PUBLIC_KEY');
        const privateKey = this.config.get('VAPID_PRIVATE_KEY');
        const subject = this.config.get('VAPID_SUBJECT') || 'mailto:admin@neighborguard.local';
        if (publicKey && privateKey) {
            webpush.setVapidDetails(subject, publicKey, privateKey);
            this.vapidConfigured = true;
            this.logger.log('Web Push configured with VAPID keys');
        }
        else {
            this.vapidConfigured = false;
            this.logger.warn('VAPID keys not configured - Web Push disabled. Run: npx web-push generate-vapid-keys');
        }
    }
    async send(token, payload) {
        if (!this.vapidConfigured) {
            this.logger.warn('Web Push not configured, skipping');
            return {
                success: false,
                error: 'VAPID not configured',
                errorCode: 'NOT_CONFIGURED',
            };
        }
        try {
            const subscription = JSON.parse(token);
            const notificationPayload = JSON.stringify({
                title: payload.title,
                body: payload.body,
                icon: '/icon-192.png',
                badge: '/badge-72.png',
                data: payload.data,
                requireInteraction: true,
                tag: payload.data?.notificationId || 'default',
                renotify: true,
            });
            const response = await webpush.sendNotification(subscription, notificationPayload);
            return {
                success: true,
                messageId: `webpush-${Date.now()}`,
            };
        }
        catch (err) {
            this.logger.error(`Web Push failed: ${err.message}`, err.stack);
            const isGone = err.statusCode === 404 || err.statusCode === 410;
            return {
                success: false,
                error: err.message,
                errorCode: err.statusCode?.toString() || 'UNKNOWN',
                shouldRemoveToken: isGone,
            };
        }
    }
    async sendBatch(tokens, payload) {
        this.logger.log(`Sending batch push to ${tokens.length} devices: ${payload.title}`);
        const results = await Promise.all(tokens.map(token => this.send(token, payload)));
        const successCount = results.filter(r => r.success).length;
        this.logger.log(`Batch complete: ${successCount}/${tokens.length} succeeded`);
        return results;
    }
    getPublicKey() {
        return this.config.get('VAPID_PUBLIC_KEY') || null;
    }
};
exports.WebPushProvider = WebPushProvider;
exports.WebPushProvider = WebPushProvider = WebPushProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WebPushProvider);
//# sourceMappingURL=web-push-provider.js.map