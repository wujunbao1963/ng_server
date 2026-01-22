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
export interface CreateCircleDto {
    name: string;
    ownerUserId: string;
}
export interface UpdateCircleDto {
    name?: string;
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
            circleName: string;
            id: string;
            circleId: string;
            userId: string;
            role: string;
            email: string | null;
            displayName: string | null;
            validFrom: Date;
            validUntil: Date | null;
            suspended: boolean;
            pinHash: string | null;
            permissions: string[] | null;
            syncVersion: number;
            createdAt: Date;
            updatedAt: Date;
        }[];
    }>;
    createUser(dto: CreateUserDto): Promise<NgUser>;
    updateUser(userId: string, dto: UpdateUserDto): Promise<NgUser>;
    deleteUser(userId: string): Promise<{
        deleted: boolean;
        userId: string;
    }>;
    listCircles(opts?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        circles: {
            memberCount: number;
            ownerEmail: string | null;
            ownerName: string | null;
            id: string;
            name: string;
            createdAt: Date;
        }[];
        total: number;
        limit: number;
        offset: number;
    }>;
    getCircle(circleId: string): Promise<{
        circle: NgCircle;
        roles: NgRole[];
    }>;
    createCircle(dto: CreateCircleDto): Promise<{
        circle: NgCircle;
        ownerRole: NgRole;
    }>;
    updateCircle(circleId: string, dto: UpdateCircleDto): Promise<NgCircle>;
    deleteCircle(circleId: string): Promise<{
        deleted: boolean;
        circleId: string;
    }>;
    getStats(): Promise<{
        users: {
            total: number;
            admins: number;
        };
        circles: {
            total: number;
        };
        roles: {
            total: number;
        };
    }>;
}
