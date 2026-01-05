import { ConfigService } from '@nestjs/config';
import { PushProviderPort, PushPayload, PushResult } from './push-provider.port';
export declare class WebPushProvider implements PushProviderPort {
    private readonly config;
    private readonly logger;
    private readonly vapidConfigured;
    constructor(config: ConfigService);
    send(token: string, payload: PushPayload): Promise<PushResult>;
    sendBatch(tokens: string[], payload: PushPayload): Promise<PushResult[]>;
    getPublicKey(): string | null;
}
