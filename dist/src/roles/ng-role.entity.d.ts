export declare class NgRole {
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
}
export declare class NgRoleAudit {
    id: string;
    circleId: string;
    roleId: string;
    targetUserId: string;
    actorUserId: string;
    action: string;
    oldValues: Record<string, any> | null;
    newValues: Record<string, any> | null;
    createdAt: Date;
}
