import { Repository } from 'typeorm';
import { NgUser } from '../auth/ng-user.entity';
import { NgCircle } from '../circles/ng-circle.entity';
import { NgRole } from '../roles/ng-role.entity';
export interface CreateUserDto {
    email: string;
    displayName?: string;
    isAdmin?: boolean;
}
export interface UpdateUserDto {
    displayName?: string;
    isAdmin?: boolean;
}
export declare class AdminService {
    private readonly usersRepo;
    private readonly circlesRepo;
    private readonly rolesRepo;
    constructor(usersRepo: Repository<NgUser>, circlesRepo: Repository<NgCircle>, rolesRepo: Repository<NgRole>);
    listUsers(opts?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        users: NgUser[];
        total: number;
        limit: number;
        offset: number;
    }>;
    getUser(userId: string): Promise<{
        user: NgUser;
        roles: {
            id: string;
            circleId: string;
            circleName: string;
            role: string;
            validFrom: Date;
            validUntil: Date | null;
            suspended: boolean;
        }[];
    }>;
    createUser(dto: CreateUserDto): Promise<NgUser>;
    updateUser(userId: string, dto: UpdateUserDto): Promise<NgUser>;
    deleteUser(userId: string): Promise<{
        deleted: boolean;
        userId: string;
    }>;
    grantOwner(userId: string): Promise<{
        user: NgUser;
        changed: boolean;
        message: string;
    }>;
    revokeOwner(userId: string): Promise<{
        user: NgUser;
        changed: boolean;
        message: string;
    }>;
    listCircles(opts?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        circles: {
            id: string;
            name: string;
            propertyType: string | null;
            address: string | null;
            city: string | null;
            createdAt: Date;
            memberCount: number;
            owner: {
                userId: string;
                email: string | null;
                displayName: string | null;
            } | null;
        }[];
        total: number;
        limit: number;
        offset: number;
    }>;
    getCircle(circleId: string): Promise<{
        circle: NgCircle;
        roles: {
            id: string;
            userId: string;
            email: string | null;
            displayName: string | null;
            role: string;
            validFrom: Date;
            validUntil: Date | null;
            suspended: boolean;
        }[];
    }>;
    getStats(): Promise<{
        users: {
            total: number;
            admins: number;
            owners: number;
        };
        circles: {
            total: number;
        };
        roles: {
            total: number;
        };
    }>;
}
