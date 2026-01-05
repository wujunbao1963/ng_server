import { PushProviderPort, PushPayload, PushResult } from './push-provider.port';
export declare class MockPushProvider implements PushProviderPort {
    private readonly logger;
    private readonly history;
    send(token: string, payload: PushPayload): Promise<PushResult>;
    sendBatch(tokens: string[], payload: PushPayload): Promise<PushResult[]>;
    getHistory(): Array<{
        token: string;
        payload: PushPayload;
        timestamp: Date;
    }>;
    clearHistory(): void;
    getLastPush(): {
        token: string;
        payload: PushPayload;
        timestamp: Date;
    } | undefined;
}
