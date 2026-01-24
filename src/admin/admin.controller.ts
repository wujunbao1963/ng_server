import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from './admin.guard';
import { AdminService, CreateUserDto, UpdateUserDto } from './admin.service';
import { EvidenceTicketsService } from '../evidence-tickets/evidence-tickets.service';

/**
 * Admin Controller - SuperAdmin API
 * 
 * 所有端点需要 JWT 认证 + Admin 权限
 * 
 * 用户管理：
 * - GET    /api/admin/users              - 列出所有用户
 * - GET    /api/admin/users/:id          - 用户详情
 * - POST   /api/admin/users              - 创建用户
 * - PATCH  /api/admin/users/:id          - 更新用户
 * - DELETE /api/admin/users/:id          - 删除用户
 * 
 * Owner 权限管理：
 * - POST   /api/admin/users/:id/grant-owner   - 授予 Owner 权限
 * - DELETE /api/admin/users/:id/grant-owner   - 撤销 Owner 权限
 * 
 * 圈子查看 (只读)：
 * - GET    /api/admin/circles            - 列出所有圈子
 * - GET    /api/admin/circles/:id        - 圈子详情
 * 
 * 统计：
 * - GET    /api/admin/stats              - 系统统计
 */
@Controller('api/admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly evidenceTickets: EvidenceTicketsService,
  ) {}

  // ==========================================================================
  // 统计
  // ==========================================================================

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  // ==========================================================================
  // 用户管理
  // ==========================================================================

  @Get('users')
  async listUsers(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminService.listUsers({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('users/:id')
  async getUser(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.adminService.getUser(id);
  }

  @Post('users')
  async createUser(@Body() dto: CreateUserDto) {
    const user = await this.adminService.createUser(dto);
    return { user };
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const user = await this.adminService.updateUser(id, dto);
    return { user };
  }

  @Delete('users/:id')
  async deleteUser(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.adminService.deleteUser(id);
  }

  // ==========================================================================
  // Owner 权限管理
  // ==========================================================================

  /**
   * 授予用户 Owner 权限
   * 
   * POST /api/admin/users/:id/grant-owner
   * 
   * Response:
   * { user, changed: boolean, message: string }
   */
  @Post('users/:id/grant-owner')
  async grantOwner(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.adminService.grantOwner(id);
  }

  /**
   * 撤销用户 Owner 权限
   * 
   * DELETE /api/admin/users/:id/grant-owner
   * 
   * 注意：如果用户已有 Circle，不能撤销
   * 
   * Response:
   * { user, changed: boolean, message: string }
   */
  @Delete('users/:id/grant-owner')
  async revokeOwner(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.adminService.revokeOwner(id);
  }

  // ==========================================================================
  // 圈子查看 (只读)
  // ==========================================================================

  @Get('circles')
  async listCircles(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminService.listCircles({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('circles/:id')
  async getCircle(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.adminService.getCircle(id);
  }

  // ==========================================================================
  // 维护功能
  // ==========================================================================

  /**
   * Clean up expired evidence tickets
   * POST /api/admin/maintenance/evidence/cleanup
   */
  @Post('maintenance/evidence/cleanup')
  async cleanupExpiredTickets() {
    const result = await this.evidenceTickets.purgeExpired();
    return { message: 'Cleanup complete', ...result };
  }
}
