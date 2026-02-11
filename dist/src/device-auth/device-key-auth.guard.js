"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceKeyAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const device_auth_service_1 = require("./device-auth.service");
function getHeader(req, name) {
    const h = req?.headers || {};
    const v = h[name] ?? h[name.toLowerCase()] ?? h[name.toUpperCase()];
    if (Array.isArray(v))
        return v[0];
    return v;
}
let DeviceKeyAuthGuard = class DeviceKeyAuthGuard {
    constructor(auth) {
        this.auth = auth;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const authHeader = getHeader(req, 'authorization');
        let token;
        if (authHeader) {
            const [schemeRaw, ...rest] = authHeader.trim().split(/\s+/);
            const scheme = (schemeRaw ?? '').toLowerCase();
            const maybeToken = rest.join(' ').trim();
            if (scheme === 'device' && maybeToken) {
                token = maybeToken;
            }
            else {
            }
        }
        if (!token) {
            const xDeviceKey = getHeader(req, 'x-device-key') ||
                getHeader(req, 'x-ng-device-key') ||
                getHeader(req, 'x-edge-device-key');
            if (xDeviceKey && xDeviceKey.trim()) {
                token = xDeviceKey.trim();
            }
        }
        if (!token) {
            throw new common_1.UnauthorizedException('Device authorization required');
        }
        const device = await this.auth.validateDeviceKey(token);
        const circleIdParam = req.params?.circleId;
        if (circleIdParam && circleIdParam !== device.circleId) {
            throw new common_1.ForbiddenException('circleId mismatch');
        }
        req.ngDevice = device;
        return true;
    }
};
exports.DeviceKeyAuthGuard = DeviceKeyAuthGuard;
exports.DeviceKeyAuthGuard = DeviceKeyAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [device_auth_service_1.DeviceAuthService])
], DeviceKeyAuthGuard);
//# sourceMappingURL=device-key-auth.guard.js.map