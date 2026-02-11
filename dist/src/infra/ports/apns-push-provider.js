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
var APNsPushProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.APNsPushProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const apn = require("@parse/node-apn");
let APNsPushProvider = APNsPushProvider_1 = class APNsPushProvider {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(APNsPushProvider_1.name);
        this.provider = null;
        const keyId = this.configService.get('APNS_KEY_ID');
        const teamId = this.configService.get('APNS_TEAM_ID');
        const keyPath = this.configService.get('APNS_KEY_PATH');
        const keyContent = this.configService.get('APNS_KEY_CONTENT');
        this.bundleId = this.configService.get('APNS_BUNDLE_ID') || 'com.neighbor-guard.app';
        const production = this.configService.get('APNS_PRODUCTION') === 'true';
        if (keyId && teamId && (keyPath || keyContent)) {
            try {
                const options = {
                    token: {
                        key: keyPath || keyContent,
                        keyId,
                        teamId,
                    },
                    production,
                };
                this.provider = new apn.Provider(options);
                this.logger.log(`APNsPushProvider initialized (${production ? 'PRODUCTION' : 'SANDBOX'})`);
            }
            catch (error) {
                this.logger.error(`Failed to initialize APNs: ${error.message}`);
                this.provider = null;
            }
        }
        else {
            this.logger.warn('APNs not configured (missing APNS_KEY_ID, APNS_TEAM_ID, or APNS_KEY_PATH/APNS_KEY_CONTENT)');
        }
    }
    isConfigured() {
        return this.provider !== null;
    }
    async send(token, payload) {
        if (!this.isConfigured()) {
            return { success: false, error: 'APNs not configured' };
        }
        const notification = new apn.Notification();
        notification.alert = {
            title: payload.title,
            body: payload.body,
        };
        if (payload.badge !== undefined) {
            notification.badge = payload.badge;
        }
        if (payload.sound) {
            notification.sound = payload.sound;
        }
        else {
            notification.sound = 'default';
        }
        if (payload.data) {
            notification.payload = payload.data;
        }
        notification.topic = this.bundleId;
        notification.contentAvailable = true;
        try {
            const result = await this.provider.send(notification, token);
            if (result.failed && result.failed.length > 0) {
                const failure = result.failed[0];
                const shouldRemove = failure.response?.reason === 'BadDeviceToken' ||
                    failure.response?.reason === 'Unregistered';
                this.logger.warn(`APNs push failed: ${failure.response?.reason || 'unknown'} for token ${token.slice(0, 10)}...`);
                return {
                    success: false,
                    error: failure.response?.reason || 'Unknown APNs error',
                    errorCode: String(failure.status),
                    shouldRemoveToken: shouldRemove,
                };
            }
            if (result.sent && result.sent.length > 0) {
                this.logger.debug(`APNs push sent to ${token.slice(0, 10)}...`);
                return {
                    success: true,
                    messageId: `apns-${Date.now()}`,
                };
            }
            this.logger.warn(`APNs push unknown status for token ${token.slice(0, 10)}...`);
            return {
                success: false,
                error: 'Unknown APNs status',
            };
        }
        catch (error) {
            this.logger.error(`APNs push error: ${error.message}`);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async sendBatch(tokens, payload) {
        if (!this.isConfigured()) {
            this.logger.warn('APNs not configured, skipping send');
            return tokens.map(() => ({ success: false, error: 'APNs not configured' }));
        }
        const results = [];
        for (const token of tokens) {
            const result = await this.send(token, payload);
            results.push(result);
        }
        const sent = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        this.logger.log(`APNs batch complete: sent=${sent} failed=${failed}`);
        return results;
    }
    async shutdown() {
        if (this.provider) {
            this.provider.shutdown();
            this.logger.log('APNs provider shutdown');
        }
    }
};
exports.APNsPushProvider = APNsPushProvider;
exports.APNsPushProvider = APNsPushProvider = APNsPushProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], APNsPushProvider);
//# sourceMappingURL=apns-push-provider.js.map