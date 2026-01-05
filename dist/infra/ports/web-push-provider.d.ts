import { ConfigService } from '@nestjs/config';
export interface PushProviderPort {
    sendBatch(tokens: string[], payload: {
        title: string;
        body: string;
        data?: any;
    }): Promise<{
        sent: number;
        failed: number;
        invalidTokens: string[];
    }>;
}
export declare class WebPushProvider implements PushProviderPort {
    private readonly configService;
    private readonly logger;
    private readonly vapidPublicKey;
    private readonly vapidPrivateKey;
    private readonly vapidSubject;
    constructor(configService: ConfigService);
    getVapidPublicKey(): string | null;
    isConfigured(): boolean;
    sendBatch(tokens: string[], payload: {
        title: string;
        body: string;
        data?: any;
    }): Promise<{
        sent: number;
        failed: number;
        invalidTokens: string[];
    }>;
}
