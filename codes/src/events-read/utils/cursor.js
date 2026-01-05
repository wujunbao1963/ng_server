"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeCursor = encodeCursor;
exports.decodeCursor = decodeCursor;
function encodeCursor(cursor) {
    const json = JSON.stringify(cursor);
    return Buffer.from(json, 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}
function decodeCursor(value) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + '='.repeat(padLen);
    const json = Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    if (!parsed.occurredAt || !parsed.eventId) {
        throw new Error('Invalid cursor payload');
    }
    return { occurredAt: parsed.occurredAt, eventId: parsed.eventId };
}
//# sourceMappingURL=cursor.js.map