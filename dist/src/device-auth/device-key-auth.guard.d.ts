import { CanActivate, ExecutionContext } from '@nestjs/common';
import { DeviceAuthService } from './device-auth.service';
export declare class DeviceKeyAuthGuard implements CanActivate {
    private readonly auth;
    constructor(auth: DeviceAuthService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
