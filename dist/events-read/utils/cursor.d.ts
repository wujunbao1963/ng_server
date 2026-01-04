export type EventsCursor = {
    occurredAt: string;
    eventId: string;
};
export declare function encodeCursor(cursor: EventsCursor): string;
export declare function decodeCursor(value: string): EventsCursor;
