import { ConfigService } from '@nestjs/config';
import { PushProviderPort, PushPayload, PushResult } from './push-provider.port';
export declare class WebPushProvider implements PushProviderPort {
    private readonly configService;
    private readonly logger;
    private readonly vapidPublicKey;
    private readonly vapidPrivateKey;
    private readonly vapidSubject;
    constructor(configService: ConfigService);
    getVapidPublicKey(): string | null;
    isConfigured(): boolean;
    send(token: string, payload: PushPayload): Promise<PushResult>;
    sendBatch(tokens: string[], payload: PushPayload): Promise<PushResult[]>;
}
