import { NgLoggerService } from './logger.service';
export interface PushPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
    clickAction?: string;
    sound?: string;
    badge?: number;
    priority?: 'normal' | 'high';
    ttl?: number;
}
export interface PushResult {
    success: boolean;
    messageId?: string;
    errorCode?: string;
    errorMessage?: string;
    retryable?: boolean;
    tokenInvalid?: boolean;
}
export interface BatchPushResult {
    successCount: number;
    failureCount: number;
    results: Array<{
        token: string;
        result: PushResult;
    }>;
    invalidTokens: string[];
}
export interface PushProviderPort {
    send(token: string, payload: PushPayload, platform: 'fcm' | 'apns'): Promise<PushResult>;
    sendBatch(tokens: string[], payload: PushPayload, platform: 'fcm' | 'apns'): Promise<BatchPushResult>;
    isAvailable(): Promise<boolean>;
}
export declare const PUSH_PROVIDER_PORT: unique symbol;
export declare class MockPushProvider implements PushProviderPort {
    private readonly logger;
    readonly sentMessages: Array<{
        token: string;
        payload: PushPayload;
        platform: string;
        timestamp: Date;
    }>;
    failingTokens: Set<string>;
    invalidTokens: Set<string>;
    constructor(logger: NgLoggerService);
    send(token: string, payload: PushPayload, platform: 'fcm' | 'apns'): Promise<PushResult>;
    sendBatch(tokens: string[], payload: PushPayload, platform: 'fcm' | 'apns'): Promise<BatchPushResult>;
    isAvailable(): Promise<boolean>;
    clear(): void;
    setTokenFailing(token: string): void;
    setTokenInvalid(token: string): void;
}
export declare class FCMPushProvider implements PushProviderPort {
    private readonly logger;
    private firebaseApp;
    private initialized;
    constructor(logger: NgLoggerService);
    private ensureInitialized;
    send(token: string, payload: PushPayload, platform: 'fcm' | 'apns'): Promise<PushResult>;
    sendBatch(tokens: string[], payload: PushPayload, platform: 'fcm' | 'apns'): Promise<BatchPushResult>;
    isAvailable(): Promise<boolean>;
}
