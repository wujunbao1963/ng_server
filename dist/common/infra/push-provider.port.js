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
exports.FCMPushProvider = exports.MockPushProvider = exports.PUSH_PROVIDER_PORT = void 0;
const common_1 = require("@nestjs/common");
const logger_service_1 = require("./logger.service");
exports.PUSH_PROVIDER_PORT = Symbol('PUSH_PROVIDER_PORT');
let MockPushProvider = class MockPushProvider {
    constructor(logger) {
        this.sentMessages = [];
        this.failingTokens = new Set();
        this.invalidTokens = new Set();
        this.logger = logger.setContext('MockPushProvider');
    }
    async send(token, payload, platform) {
        this.logger.log('Mock push send', {
            token: token.substring(0, 8) + '...',
            title: payload.title,
            platform,
        });
        this.sentMessages.push({
            token,
            payload,
            platform,
            timestamp: new Date(),
        });
        if (this.invalidTokens.has(token)) {
            return {
                success: false,
                errorCode: 'INVALID_TOKEN',
                errorMessage: 'The registration token is not a valid FCM registration token',
                retryable: false,
                tokenInvalid: true,
            };
        }
        if (this.failingTokens.has(token)) {
            return {
                success: false,
                errorCode: 'UNAVAILABLE',
                errorMessage: 'Service temporarily unavailable',
                retryable: true,
                tokenInvalid: false,
            };
        }
        return {
            success: true,
            messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
    }
    async sendBatch(tokens, payload, platform) {
        this.logger.log('Mock push sendBatch', {
            tokenCount: tokens.length,
            title: payload.title,
            platform,
        });
        const results = [];
        const invalidTokensList = [];
        let successCount = 0;
        let failureCount = 0;
        for (const token of tokens) {
            const result = await this.send(token, payload, platform);
            results.push({ token, result });
            if (result.success) {
                successCount++;
            }
            else {
                failureCount++;
                if (result.tokenInvalid) {
                    invalidTokensList.push(token);
                }
            }
        }
        return {
            successCount,
            failureCount,
            results,
            invalidTokens: invalidTokensList,
        };
    }
    async isAvailable() {
        return true;
    }
    clear() {
        this.sentMessages.length = 0;
        this.failingTokens.clear();
        this.invalidTokens.clear();
    }
    setTokenFailing(token) {
        this.failingTokens.add(token);
    }
    setTokenInvalid(token) {
        this.invalidTokens.add(token);
    }
};
exports.MockPushProvider = MockPushProvider;
exports.MockPushProvider = MockPushProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_1.NgLoggerService])
], MockPushProvider);
let FCMPushProvider = class FCMPushProvider {
    constructor(logger) {
        this.firebaseApp = null;
        this.initialized = false;
        this.logger = logger.setContext('FCMPushProvider');
    }
    async ensureInitialized() {
        if (this.initialized)
            return;
        try {
            const admin = await Promise.resolve().then(() => require('firebase-admin'));
            if (!admin.apps.length) {
                const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
                const projectId = process.env.FIREBASE_PROJECT_ID;
                if (serviceAccount) {
                    const credential = admin.credential.cert(serviceAccount);
                    this.firebaseApp = admin.initializeApp({ credential, projectId });
                }
                else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                    this.firebaseApp = admin.initializeApp({ projectId });
                }
                else {
                    throw new Error('Firebase credentials not configured');
                }
            }
            else {
                this.firebaseApp = admin.apps[0];
            }
            this.initialized = true;
            this.logger.log('Firebase Admin SDK initialized');
        }
        catch (error) {
            this.logger.error('Failed to initialize Firebase Admin SDK', String(error));
            throw error;
        }
    }
    async send(token, payload, platform) {
        await this.ensureInitialized();
        const admin = await Promise.resolve().then(() => require('firebase-admin'));
        const messaging = admin.messaging();
        const message = {
            token,
            notification: {
                title: payload.title,
                body: payload.body,
                imageUrl: payload.imageUrl,
            },
            data: payload.data,
            android: {
                priority: payload.priority === 'high' ? 'high' : 'normal',
                ttl: payload.ttl ? payload.ttl * 1000 : undefined,
                notification: {
                    sound: payload.sound || 'default',
                    clickAction: payload.clickAction,
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: payload.sound || 'default',
                        badge: payload.badge,
                    },
                },
            },
        };
        try {
            const response = await messaging.send(message);
            this.logger.log('Push sent successfully', {
                messageId: response,
                token: token.substring(0, 8) + '...',
            });
            return {
                success: true,
                messageId: response,
            };
        }
        catch (error) {
            const errorCode = error.code || 'UNKNOWN';
            const errorMessage = error.message || 'Unknown error';
            this.logger.error('Push send failed', errorMessage, {
                errorCode,
                token: token.substring(0, 8) + '...',
            });
            const tokenInvalid = [
                'messaging/invalid-registration-token',
                'messaging/registration-token-not-registered',
            ].includes(errorCode);
            const retryable = [
                'messaging/server-unavailable',
                'messaging/internal-error',
            ].includes(errorCode);
            return {
                success: false,
                errorCode,
                errorMessage,
                retryable,
                tokenInvalid,
            };
        }
    }
    async sendBatch(tokens, payload, platform) {
        await this.ensureInitialized();
        const admin = await Promise.resolve().then(() => require('firebase-admin'));
        const messaging = admin.messaging();
        const message = {
            notification: {
                title: payload.title,
                body: payload.body,
                imageUrl: payload.imageUrl,
            },
            data: payload.data,
            android: {
                priority: payload.priority === 'high' ? 'high' : 'normal',
                notification: {
                    sound: payload.sound || 'default',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: payload.sound || 'default',
                        badge: payload.badge,
                    },
                },
            },
        };
        try {
            const response = await messaging.sendEachForMulticast({
                tokens,
                ...message,
            });
            const results = [];
            const invalidTokensList = [];
            response.responses.forEach((resp, idx) => {
                const token = tokens[idx];
                if (resp.success) {
                    results.push({
                        token,
                        result: { success: true, messageId: resp.messageId },
                    });
                }
                else {
                    const errorCode = resp.error?.code || 'UNKNOWN';
                    const tokenInvalid = [
                        'messaging/invalid-registration-token',
                        'messaging/registration-token-not-registered',
                    ].includes(errorCode);
                    if (tokenInvalid) {
                        invalidTokensList.push(token);
                    }
                    results.push({
                        token,
                        result: {
                            success: false,
                            errorCode,
                            errorMessage: resp.error?.message,
                            tokenInvalid,
                            retryable: !tokenInvalid,
                        },
                    });
                }
            });
            this.logger.log('Batch push completed', {
                successCount: response.successCount,
                failureCount: response.failureCount,
            });
            return {
                successCount: response.successCount,
                failureCount: response.failureCount,
                results,
                invalidTokens: invalidTokensList,
            };
        }
        catch (error) {
            this.logger.error('Batch push failed', error.message);
            return {
                successCount: 0,
                failureCount: tokens.length,
                results: tokens.map((token) => ({
                    token,
                    result: {
                        success: false,
                        errorCode: error.code || 'UNKNOWN',
                        errorMessage: error.message,
                        retryable: true,
                    },
                })),
                invalidTokens: [],
            };
        }
    }
    async isAvailable() {
        try {
            await this.ensureInitialized();
            return true;
        }
        catch {
            return false;
        }
    }
};
exports.FCMPushProvider = FCMPushProvider;
exports.FCMPushProvider = FCMPushProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_1.NgLoggerService])
], FCMPushProvider);
//# sourceMappingURL=push-provider.port.js.map