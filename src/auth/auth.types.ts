/**
 * JWT Payload / User context from JWT token
 */
export interface JwtUser {
  userId: string;
  email: string;
  isAdmin?: boolean;
}

/**
 * JWT Payload sent to client
 */
export interface JwtPayload {
  sub: string;  // userId
  email: string;
  iat?: number;
  exp?: number;
}
