export interface JwtUser {
    userId: string;
    email: string;
    isAdmin?: boolean;
}
export interface JwtPayload {
    sub: string;
    email: string;
    iat?: number;
    exp?: number;
}
