import { PushProviderPort, PushPayload, PushResult } from './push-provider.port';
export declare class MultiPushProvider implements PushProviderPort {
    private readonly webPushProvider;
    private readonly apnsPushProvider;
    private readonly logger;
    constructor(webPushProvider: PushProviderPort, apnsPushProvider: PushProviderPort);
    private selectProvider;
    send(token: string, payload: PushPayload): Promise<PushResult>;
    sendBatch(tokens: string[], payload: PushPayload): Promise<PushResult[]>;
    sendByPlatform(platform: string, token: string, payload: PushPayload): Promise<PushResult>;
    sendBatchByPlatform(devices: Array<{
        platform: string;
        token: string;
    }>, payload: PushPayload): Promise<PushResult[]>;
}
