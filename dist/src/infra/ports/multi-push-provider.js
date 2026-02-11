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
var MultiPushProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiPushProvider = void 0;
const common_1 = require("@nestjs/common");
let MultiPushProvider = MultiPushProvider_1 = class MultiPushProvider {
    constructor(webPushProvider, apnsPushProvider) {
        this.webPushProvider = webPushProvider;
        this.apnsPushProvider = apnsPushProvider;
        this.logger = new common_1.Logger(MultiPushProvider_1.name);
        this.logger.log('MultiPushProvider initialized with WebPush and APNs');
    }
    selectProvider(platform) {
        switch (platform.toLowerCase()) {
            case 'web':
                return this.webPushProvider;
            case 'ios':
                return this.apnsPushProvider;
            case 'android':
                this.logger.warn('Android push not implemented yet');
                return null;
            default:
                this.logger.warn(`Unknown platform: ${platform}`);
                return null;
        }
    }
    async send(token, payload) {
        try {
            JSON.parse(token);
            return await this.webPushProvider.send(token, payload);
        }
        catch {
            return await this.apnsPushProvider.send(token, payload);
        }
    }
    async sendBatch(tokens, payload) {
        const results = [];
        for (const token of tokens) {
            const result = await this.send(token, payload);
            results.push(result);
        }
        return results;
    }
    async sendByPlatform(platform, token, payload) {
        const provider = this.selectProvider(platform);
        if (!provider) {
            return {
                success: false,
                error: `No provider available for platform: ${platform}`,
            };
        }
        return await provider.send(token, payload);
    }
    async sendBatchByPlatform(devices, payload) {
        const devicesByPlatform = new Map();
        devices.forEach((device, index) => {
            const platform = device.platform.toLowerCase();
            if (!devicesByPlatform.has(platform)) {
                devicesByPlatform.set(platform, []);
            }
            devicesByPlatform.get(platform).push({ token: device.token, index });
        });
        const results = new Array(devices.length);
        for (const [platform, platformDevices] of devicesByPlatform.entries()) {
            const provider = this.selectProvider(platform);
            if (!provider) {
                for (const { index } of platformDevices) {
                    results[index] = {
                        success: false,
                        error: `No provider for platform: ${platform}`,
                    };
                }
                continue;
            }
            const tokens = platformDevices.map(d => d.token);
            const platformResults = await provider.sendBatch(tokens, payload);
            platformDevices.forEach(({ index }, i) => {
                results[index] = platformResults[i];
            });
        }
        const byPlatform = new Map();
        devices.forEach((device, i) => {
            const platform = device.platform.toLowerCase();
            if (!byPlatform.has(platform)) {
                byPlatform.set(platform, { success: 0, failed: 0 });
            }
            const stats = byPlatform.get(platform);
            if (results[i].success) {
                stats.success++;
            }
            else {
                stats.failed++;
            }
        });
        for (const [platform, stats] of byPlatform.entries()) {
            this.logger.log(`${platform}: sent=${stats.success} failed=${stats.failed}`);
        }
        return results;
    }
};
exports.MultiPushProvider = MultiPushProvider;
exports.MultiPushProvider = MultiPushProvider = MultiPushProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object, Object])
], MultiPushProvider);
//# sourceMappingURL=multi-push-provider.js.map