import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DeviceAuthService } from './device-auth.service';

function getHeader(req: any, name: string): string | undefined {
  // Node/Nest lowercases header keys, but be defensive
  const h = req?.headers || {};
  const v = h[name] ?? h[name.toLowerCase()] ?? h[name.toUpperCase()];
  if (Array.isArray(v)) return v[0];
  return v;
}

@Injectable()
export class DeviceKeyAuthGuard implements CanActivate {
  constructor(private readonly auth: DeviceAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: any = context.switchToHttp().getRequest();

    // --- 1) Preferred: Authorization: Device <token>
    const authHeader = getHeader(req, 'authorization');
    let token: string | undefined;

    if (authHeader) {
      const [schemeRaw, ...rest] = authHeader.trim().split(/\s+/);
      const scheme = (schemeRaw ?? '').toLowerCase();
      const maybeToken = rest.join(' ').trim();
      if (scheme === 'device' && maybeToken) {
        token = maybeToken;
      } else {
        // If Authorization exists but is not Device-scheme, we DON'T reject immediately,
        // because UI/app may send Bearer, and device auth might be passed via X-Device-Key.
        // We'll fall back to X-Device-Key below.
      }
    }

    // --- 2) Fallback: X-Device-Key / X-NG-Device-Key
    if (!token) {
      const xDeviceKey =
        getHeader(req, 'x-device-key') ||
        getHeader(req, 'x-ng-device-key') ||
        getHeader(req, 'x-edge-device-key');

      if (xDeviceKey && xDeviceKey.trim()) {
        token = xDeviceKey.trim();
      }
    }

    if (!token) {
      throw new UnauthorizedException('Device authorization required');
    }

    const device = await this.auth.validateDeviceKey(token);

    // Optional: if the route is scoped by circleId, enforce match.
    const circleIdParam = req.params?.circleId;
    if (circleIdParam && circleIdParam !== device.circleId) {
      throw new ForbiddenException('circleId mismatch');
    }

    req.ngDevice = device;
    return true;
  }
}

