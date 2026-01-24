import { AuthService } from './auth.service';
import { DevLoginDto } from './dto/dev-login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtUser } from './auth.types';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            displayName: string | null;
            isAdmin: boolean;
            canCreateCircle: boolean;
        };
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            displayName: string | null;
            isAdmin: boolean;
            canCreateCircle: boolean;
        };
    }>;
    devLogin(dto: DevLoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            displayName: string | null;
            isAdmin: boolean;
            canCreateCircle: boolean;
        };
    }>;
    getMe(req: {
        user: JwtUser;
    }): Promise<import("./auth.service").UserWithCircles>;
}
export declare class CircleAuthController {
    private readonly authService;
    constructor(authService: AuthService);
    getMyRole(req: {
        user: JwtUser;
    }, circleId: string): Promise<{
        role: string | null;
        validFrom: string | null;
        validUntil: string | null;
        suspended: boolean;
        permissions: string[] | null;
    }>;
}
