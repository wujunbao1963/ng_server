import { NgEdgeDevice } from '../edge-devices/ng-edge-device.entity';
import { CirclesService } from '../circles/circles.service';
import { JwtUser } from '../auth/auth.types';
import { RolesService, CreateRoleDto, UpdateRoleDto } from './roles.service';
export declare class RolesController {
    private readonly svc;
    private readonly circles;
    constructor(svc: RolesService, circles: CirclesService);
    listRoles(req: {
        user: JwtUser;
    }, circleId: string): Promise<{
        roles: import("./ng-role.entity").NgRole[];
        count: number;
    }>;
    createRole(req: {
        user: JwtUser;
    }, circleId: string, body: CreateRoleDto): Promise<{
        role: import("./ng-role.entity").NgRole;
    }>;
    getRole(req: {
        user: JwtUser;
    }, circleId: string, roleId: string): Promise<{
        role: import("./ng-role.entity").NgRole;
    }>;
    updateRole(req: {
        user: JwtUser;
    }, circleId: string, roleId: string, body: UpdateRoleDto): Promise<{
        role: import("./ng-role.entity").NgRole;
    }>;
    revokeRole(req: {
        user: JwtUser;
    }, circleId: string, roleId: string): Promise<{
        ok: boolean;
    }>;
    suspendRole(req: {
        user: JwtUser;
    }, circleId: string, roleId: string): Promise<{
        role: import("./ng-role.entity").NgRole;
    }>;
    unsuspendRole(req: {
        user: JwtUser;
    }, circleId: string, roleId: string): Promise<{
        role: import("./ng-role.entity").NgRole;
    }>;
    verifyPin(req: {
        user: JwtUser;
    }, circleId: string, body: {
        userId: string;
        pin: string;
    }): Promise<{
        valid: boolean;
    }>;
    syncRoles(circleId: string, device: NgEdgeDevice, sinceVersionStr?: string): Promise<{
        ok: boolean;
        error: string;
    } | {
        roles: import("./roles.service").RoleSyncDto[];
        serverVersion: number;
        fullSync: boolean;
        ok: boolean;
        error?: undefined;
    }>;
}
