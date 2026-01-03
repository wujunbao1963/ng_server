import { AuthService } from './auth.service';
import { DevLoginDto } from './dto/dev-login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    devLogin(dto: DevLoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            displayName: string | null;
        };
    }>;
}
