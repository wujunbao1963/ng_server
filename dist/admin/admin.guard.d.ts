import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Repository } from 'typeorm';
import { NgUser } from '../auth/ng-user.entity';
export declare class AdminGuard implements CanActivate {
    private readonly usersRepo;
    constructor(usersRepo: Repository<NgUser>);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
