import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { NgUser } from './ng-user.entity';
import { NgRole } from '../roles/ng-role.entity';
import { NgCircle } from '../circles/ng-circle.entity';
export interface UserWithCircles {
    id: string;
    email: string;
    displayName: string | null;
    isAdmin: boolean;
    canCreateCircle: boolean;
    circles: Array<{
        circleId: string;
        circleName: string;
        role: string;
        validFrom: string;
        validUntil: string | null;
        suspended: boolean;
    }>;
}
export declare class AuthService {
    private readonly usersRepo;
    private readonly rolesRepo;
    private readonly circlesRepo;
    private readonly jwt;
    constructor(usersRepo: Repository<NgUser>, rolesRepo: Repository<NgRole>, circlesRepo: Repository<NgCircle>, jwt: JwtService);
    register(email: string, password: string, displayName?: string, inviteCode?: string): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            displayName: string | null;
            isAdmin: boolean;
            canCreateCircle: boolean;
        };
    }>;
    login(email: string, password: string): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            displayName: string | null;
            isAdmin: boolean;
            canCreateCircle: boolean;
        };
    }>;
    devLogin(email: string, displayName?: string): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            displayName: string | null;
            isAdmin: boolean;
            canCreateCircle: boolean;
        };
    }>;
    getCurrentUser(userId: string): Promise<UserWithCircles>;
    getMyRoleInCircle(userId: string, circleId: string): Promise<{
        role: string | null;
        validFrom: string | null;
        validUntil: string | null;
        suspended: boolean;
        permissions: string[] | null;
    }>;
}
