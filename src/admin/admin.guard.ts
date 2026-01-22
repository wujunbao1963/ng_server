import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NgUser } from '../auth/ng-user.entity';

/**
 * AdminGuard - 验证用户是否为管理员
 * 
 * 使用方式：
 * @UseGuards(AuthGuard('jwt'), AdminGuard)
 * 
 * 必须在 AuthGuard('jwt') 之后使用，因为需要 req.user.userId
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @InjectRepository(NgUser)
    private readonly usersRepo: Repository<NgUser>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const user = await this.usersRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    // 将完整用户信息附加到请求
    request.adminUser = user;
    return true;
  }
}
