import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PushProviderPort, PushPayload, PushResult } from './push-provider.port';
export declare class ApnsPushProvider implements PushProviderPort, OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private readonly keyId;
    private readonly teamId;
    private readonly bundleId;
    private readonly key;
    private readonly host;
    private client;
    private cachedToken;
    private tokenGeneratedAt;
    private static readonly TOKEN_TTL_MS;
    constructor(configService: ConfigService);
    isConfigured(): boolean;
    onModuleDestroy(): void;
    send(token: string, payload: PushPayload): Promise<PushResult>;
    sendBatch(tokens: string[], payload: PushPayload): Promise<PushResult[]>;
    private buildApnsPayload;
    private getOrRefreshToken;
    private getClient;
    private destroyClient;
    private sendRequest;
}
