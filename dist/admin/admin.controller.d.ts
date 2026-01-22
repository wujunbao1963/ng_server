import { AdminService, CreateUserDto, UpdateUserDto, CreateCircleDto, UpdateCircleDto } from './admin.service';
import { EvidenceTicketsService } from '../evidence-tickets/evidence-tickets.service';
export declare class AdminController {
    private readonly adminService;
    private readonly evidenceTickets;
    constructor(adminService: AdminService, evidenceTickets: EvidenceTicketsService);
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
    listUsers(limit?: string, offset?: string): Promise<{
        users: import("../auth/ng-user.entity").NgUser[];
        total: number;
        limit: number;
        offset: number;
    }>;
    getUser(id: string): Promise<{
        user: import("../auth/ng-user.entity").NgUser;
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
    createUser(dto: CreateUserDto): Promise<{
        user: import("../auth/ng-user.entity").NgUser;
    }>;
    updateUser(id: string, dto: UpdateUserDto): Promise<{
        user: import("../auth/ng-user.entity").NgUser;
    }>;
    deleteUser(id: string): Promise<{
        deleted: boolean;
        userId: string;
    }>;
    listCircles(limit?: string, offset?: string): Promise<{
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
    getCircle(id: string): Promise<{
        circle: import("../circles/ng-circle.entity").NgCircle;
        roles: import("../roles/ng-role.entity").NgRole[];
    }>;
    createCircle(dto: CreateCircleDto): Promise<{
        circle: import("../circles/ng-circle.entity").NgCircle;
        ownerRole: import("../roles/ng-role.entity").NgRole;
    }>;
    updateCircle(id: string, dto: UpdateCircleDto): Promise<{
        circle: import("../circles/ng-circle.entity").NgCircle;
    }>;
    deleteCircle(id: string): Promise<{
        deleted: boolean;
        circleId: string;
    }>;
    cleanupExpiredTickets(): Promise<{
        deletedTickets: number;
        deletedLeases: number;
        message: string;
    }>;
}
