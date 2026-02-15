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
var ApnsPushProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApnsPushProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const http2 = require("http2");
const jwt = require("jsonwebtoken");
const fs = require("fs");
let ApnsPushProvider = ApnsPushProvider_1 = class ApnsPushProvider {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(ApnsPushProvider_1.name);
        this.client = null;
        this.cachedToken = null;
        this.tokenGeneratedAt = 0;
        this.keyId = this.configService.get('APNS_KEY_ID') || '';
        this.teamId = this.configService.get('APNS_TEAM_ID') || '';
        this.bundleId = this.configService.get('APNS_BUNDLE_ID') || '';
        const keyPath = this.configService.get('APNS_KEY_PATH') || '';
        const keyContent = this.configService.get('APNS_KEY_CONTENT') || '';
        this.key = keyContent || (keyPath ? fs.readFileSync(keyPath, 'utf8') : '');
        const env = this.configService.get('APNS_ENVIRONMENT') || 'production';
        this.host = env === 'development'
            ? 'api.sandbox.push.apple.com'
            : 'api.push.apple.com';
        if (this.isConfigured()) {
            this.logger.log(`ApnsPushProvider initialized (env=${env}, bundleId=${this.bundleId})`);
        }
        else {
            this.logger.warn('APNS not fully configured, iOS push will not work');
        }
    }
    isConfigured() {
        return !!(this.keyId && this.teamId && this.bundleId && this.key);
    }
    onModuleDestroy() {
        this.destroyClient();
    }
    async send(token, payload) {
        if (!this.isConfigured()) {
            return { success: false, error: 'APNS not configured' };
        }
        const apnsPayload = this.buildApnsPayload(payload);
        const jwtToken = this.getOrRefreshToken();
        try {
            return await this.sendRequest(token, apnsPayload, jwtToken);
        }
        catch (error) {
            if (error.code === 'ERR_HTTP2_GOAWAY_SESSION' || error.code === 'ECONNRESET') {
                this.destroyClient();
                try {
                    return await this.sendRequest(token, apnsPayload, jwtToken);
                }
                catch (retryError) {
                    this.logger.error(`APNS retry failed: ${retryError.message}`);
                    return { success: false, error: retryError.message };
                }
            }
            this.logger.error(`APNS send failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    async sendBatch(tokens, payload) {
        if (!this.isConfigured()) {
            this.logger.warn('APNS not configured, skipping send');
            return tokens.map(() => ({ success: false, error: 'APNS not configured' }));
        }
        const results = [];
        for (const token of tokens) {
            const result = await this.send(token, payload);
            results.push(result);
        }
        const sent = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        this.logger.log(`APNS batch complete: sent=${sent} failed=${failed}`);
        return results;
    }
    buildApnsPayload(payload) {
        const aps = {
            alert: { title: payload.title, body: payload.body },
            sound: payload.sound || 'default',
            'mutable-content': 1,
        };
        if (payload.badge !== undefined) {
            aps.badge = payload.badge;
        }
        return JSON.stringify({
            aps,
            ...payload.data,
        });
    }
    getOrRefreshToken() {
        const now = Date.now();
        if (this.cachedToken && now - this.tokenGeneratedAt < ApnsPushProvider_1.TOKEN_TTL_MS) {
            return this.cachedToken;
        }
        const token = jwt.sign({}, this.key, {
            algorithm: 'ES256',
            keyid: this.keyId,
            issuer: this.teamId,
            expiresIn: '1h',
        });
        this.cachedToken = token;
        this.tokenGeneratedAt = now;
        this.logger.debug('APNS JWT token refreshed');
        return token;
    }
    getClient() {
        if (this.client && !this.client.closed && !this.client.destroyed) {
            return this.client;
        }
        this.client = http2.connect(`https://${this.host}`);
        this.client.on('error', (err) => {
            this.logger.error(`APNS HTTP/2 connection error: ${err.message}`);
        });
        this.client.on('goaway', () => {
            this.logger.warn('APNS server sent GOAWAY, will reconnect on next request');
            this.destroyClient();
        });
        return this.client;
    }
    destroyClient() {
        if (this.client) {
            try {
                this.client.close();
            }
            catch {
            }
            this.client = null;
        }
    }
    sendRequest(deviceToken, payload, jwtToken) {
        return new Promise((resolve, reject) => {
            const client = this.getClient();
            const headers = {
                ':method': 'POST',
                ':path': `/3/device/${deviceToken}`,
                'authorization': `bearer ${jwtToken}`,
                'apns-topic': this.bundleId,
                'apns-push-type': 'alert',
                'apns-priority': '10',
                'content-type': 'application/json',
            };
            const req = client.request(headers);
            req.setEncoding('utf8');
            let responseData = '';
            let statusCode;
            req.on('response', (headers) => {
                statusCode = headers[':status'];
            });
            req.on('data', (chunk) => {
                responseData += chunk;
            });
            req.on('end', () => {
                if (statusCode === 200) {
                    resolve({ success: true, messageId: `apns-${deviceToken.slice(-8)}` });
                    return;
                }
                let errorReason = 'Unknown';
                try {
                    const body = JSON.parse(responseData);
                    errorReason = body.reason || 'Unknown';
                }
                catch {
                }
                const shouldRemoveToken = [
                    'BadDeviceToken',
                    'Unregistered',
                    'DeviceTokenNotForTopic',
                    'ExpiredToken',
                ].includes(errorReason);
                this.logger.warn(`APNS error: status=${statusCode} reason=${errorReason} token=${deviceToken.slice(-8)}`);
                resolve({
                    success: false,
                    error: errorReason,
                    errorCode: String(statusCode),
                    shouldRemoveToken,
                });
            });
            req.on('error', (err) => {
                reject(err);
            });
            req.write(payload);
            req.end();
        });
    }
};
exports.ApnsPushProvider = ApnsPushProvider;
ApnsPushProvider.TOKEN_TTL_MS = 50 * 60 * 1000;
exports.ApnsPushProvider = ApnsPushProvider = ApnsPushProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ApnsPushProvider);
//# sourceMappingURL=apns-push-provider.js.map