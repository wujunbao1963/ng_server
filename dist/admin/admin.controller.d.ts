import { AdminService, CreateUserDto, UpdateUserDto } from './admin.service';
import { EvidenceTicketsService } from '../evidence-tickets/evidence-tickets.service';
export declare class AdminController {
    private readonly adminService;
    private readonly evidenceTickets;
    constructor(adminService: AdminService, evidenceTickets: EvidenceTicketsService);
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
    listUsers(limit?: string, offset?: string): Promise<{
        users: import("../auth/ng-user.entity").NgUser[];
        total: number;
        limit: number;
        offset: number;
    }>;
    getUser(id: string): Promise<{
        user: import("../auth/ng-user.entity").NgUser;
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
    grantOwner(id: string): Promise<{
        user: import("../auth/ng-user.entity").NgUser;
        changed: boolean;
        message: string;
    }>;
    revokeOwner(id: string): Promise<{
        user: import("../auth/ng-user.entity").NgUser;
        changed: boolean;
        message: string;
    }>;
    listCircles(limit?: string, offset?: string): Promise<{
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
    getCircle(id: string): Promise<{
        circle: import("../circles/ng-circle.entity").NgCircle;
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
    cleanupExpiredTickets(): Promise<{
        deletedTickets: number;
        deletedLeases: number;
        message: string;
    }>;
}
