export interface PushPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
    sound?: string;
    badge?: number;
}
export interface PushResult {
    success: boolean;
    messageId?: string;
    error?: string;
    errorCode?: string;
    shouldRemoveToken?: boolean;
}
export interface PushProviderPort {
    send(token: string, payload: PushPayload): Promise<PushResult>;
    sendBatch(tokens: string[], payload: PushPayload): Promise<PushResult[]>;
}
export declare const PUSH_PROVIDER_PORT: unique symbol;
