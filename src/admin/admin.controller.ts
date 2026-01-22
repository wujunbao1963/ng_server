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
import { AdminService, CreateUserDto, UpdateUserDto, CreateCircleDto, UpdateCircleDto } from './admin.service';
import { EvidenceTicketsService } from '../evidence-tickets/evidence-tickets.service';

/**
 * Admin Controller - 管理员 API
 * 
 * 所有端点需要 JWT 认证 + Admin 权限
 * 
 * 用户管理：
 * - GET    /api/admin/users          - 列出所有用户
 * - GET    /api/admin/users/:id      - 用户详情
 * - POST   /api/admin/users          - 创建用户
 * - PATCH  /api/admin/users/:id      - 更新用户
 * - DELETE /api/admin/users/:id      - 删除用户
 * 
 * 圈子管理：
 * - GET    /api/admin/circles        - 列出所有圈子
 * - GET    /api/admin/circles/:id    - 圈子详情
 * - POST   /api/admin/circles        - 创建圈子
 * - PATCH  /api/admin/circles/:id    - 更新圈子
 * - DELETE /api/admin/circles/:id    - 删除圈子
 * 
 * 统计：
 * - GET    /api/admin/stats          - 系统统计
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
  // 圈子管理
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

  @Post('circles')
  async createCircle(@Body() dto: CreateCircleDto) {
    return this.adminService.createCircle(dto);
  }

  @Patch('circles/:id')
  async updateCircle(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCircleDto,
  ) {
    const circle = await this.adminService.updateCircle(id, dto);
    return { circle };
  }

  @Delete('circles/:id')
  async deleteCircle(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.adminService.deleteCircle(id);
  }

  // ==========================================================================
  // 维护功能（保留原有功能）
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
