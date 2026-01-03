import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { NgUser } from './ng-user.entity';
export declare class AuthService {
    private readonly usersRepo;
    private readonly jwt;
    constructor(usersRepo: Repository<NgUser>, jwt: JwtService);
    devLogin(email: string, displayName?: string): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            displayName: string | null;
        };
    }>;
}
