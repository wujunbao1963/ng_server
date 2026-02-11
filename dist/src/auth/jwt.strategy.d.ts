import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { NgUser } from './ng-user.entity';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly usersRepo;
    constructor(config: ConfigService, usersRepo: Repository<NgUser>);
    validate(payload: any): Promise<{
        userId: string;
        email: string;
    } | null>;
}
export {};
