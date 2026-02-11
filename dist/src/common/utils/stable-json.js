"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stableStringify = stableStringify;
function stableStringify(value) {
    return JSON.stringify(sortRecursively(value));
}
function sortRecursively(value) {
    if (Array.isArray(value)) {
        return value.map(sortRecursively);
    }
    if (value && typeof value === 'object') {
        const obj = value;
        const keys = Object.keys(obj).sort();
        const out = {};
        for (const k of keys) {
            out[k] = sortRecursively(obj[k]);
        }
        return out;
    }
    return value;
}
//# sourceMappingURL=stable-json.js.map