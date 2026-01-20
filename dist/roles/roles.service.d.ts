import { Repository } from 'typeorm';
import { NgRole, NgRoleAudit } from './ng-role.entity';
export interface CreateRoleDto {
    userId: string;
    role: string;
    email?: string;
    displayName?: string;
    validFrom?: Date;
    validUntil?: Date;
    pin?: string;
    permissions?: string[];
}
export interface UpdateRoleDto {
    role?: string;
    email?: string;
    displayName?: string;
    validFrom?: Date;
    validUntil?: Date;
    suspended?: boolean;
    pin?: string;
    permissions?: string[];
}
export interface RoleSyncDto {
    userId: string;
    role: string;
    email?: string | null;
    displayName?: string | null;
    validFrom: string;
    validUntil?: string | null;
    suspended: boolean;
    syncVersion: number;
}
export declare class RolesService {
    private readonly roleRepo;
    private readonly auditRepo;
    private readonly logger;
    private readonly BCRYPT_ROUNDS;
    constructor(roleRepo: Repository<NgRole>, auditRepo: Repository<NgRoleAudit>);
    createRole(circleId: string, actorUserId: string, dto: CreateRoleDto): Promise<NgRole>;
    updateRole(circleId: string, roleId: string, actorUserId: string, dto: UpdateRoleDto): Promise<NgRole>;
    suspendRole(circleId: string, roleId: string, actorUserId: string): Promise<NgRole>;
    unsuspendRole(circleId: string, roleId: string, actorUserId: string): Promise<NgRole>;
    revokeRole(circleId: string, roleId: string, actorUserId: string): Promise<void>;
    getRole(circleId: string, roleId: string): Promise<NgRole>;
    getRoleByUserId(circleId: string, userId: string): Promise<NgRole | null>;
    listRoles(circleId: string): Promise<NgRole[]>;
    getRolesForSync(circleId: string, sinceVersion?: number): Promise<{
        roles: RoleSyncDto[];
        serverVersion: number;
        fullSync: boolean;
    }>;
    verifyPin(circleId: string, userId: string, pin: string): Promise<boolean>;
    private mustBeOwner;
    private audit;
}
