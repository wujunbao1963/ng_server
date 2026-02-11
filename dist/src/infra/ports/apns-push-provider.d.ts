import { ConfigService } from '@nestjs/config';
import { PushProviderPort, PushPayload, PushResult } from './push-provider.port';
export declare class APNsPushProvider implements PushProviderPort {
    private readonly configService;
    private readonly logger;
    private provider;
    private readonly bundleId;
    constructor(configService: ConfigService);
    isConfigured(): boolean;
    send(token: string, payload: PushPayload): Promise<PushResult>;
    sendBatch(tokens: string[], payload: PushPayload): Promise<PushResult[]>;
    shutdown(): Promise<void>;
}
