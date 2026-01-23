export declare class NgUser {
    id: string;
    email: string;
    displayName: string | null;
    passwordHash: string | null;
    isAdmin: boolean;
    canCreateCircle: boolean;
    createdAt: Date;
    updatedAt: Date;
}
