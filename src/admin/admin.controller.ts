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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AdminGuard } from './admin.guard';
import { AdminService, CreateUserDto, UpdateUserDto } from './admin.service';
import { EvidenceTicketsService } from '../evidence-tickets/evidence-tickets.service';
import { OutboxService } from '../common/outbox/outbox.service';
import { OutboxWorker } from '../common/outbox/outbox.worker';
import { NgOutbox, OutboxStatus } from '../common/outbox/ng-outbox.entity';
import { WebPushProvider } from '../infra/ports/web-push-provider';
import { NgNotification } from '../notifications/ng-notification.entity';
import { NgPushDevice } from '../notifications/ng-push-device.entity';

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
    private readonly outboxService: OutboxService,
    private readonly outboxWorker: OutboxWorker,
    private readonly webPushProvider: WebPushProvider,
    @InjectRepository(NgOutbox)
    private readonly outboxRepo: Repository<NgOutbox>,
    @InjectRepository(NgNotification)
    private readonly notificationsRepo: Repository<NgNotification>,
    @InjectRepository(NgPushDevice)
    private readonly pushDevicesRepo: Repository<NgPushDevice>,
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

  // ==========================================================================
  // Push & Outbox 诊断
  // ==========================================================================

  /**
   * 诊断 Push 通知系统
   * GET /api/admin/diagnostics/push
   */
  @Get('diagnostics/push')
  async diagnosePush() {
    // 1. WebPush 配置状态
    const webPushConfigured = this.webPushProvider.isConfigured();
    const vapidPublicKey = this.webPushProvider.getVapidPublicKey();

    // 2. Outbox 状态统计
    const outboxStats = await this.outboxService.getStats();

    // 3. Worker 状态
    const workerStats = this.outboxWorker.getStats();

    // 4. 获取最近的 FAILED/DEAD 消息
    const recentFailures = await this.outboxRepo.find({
      where: { status: In([OutboxStatus.FAILED, OutboxStatus.DEAD]) },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // 5. 最近创建的通知
    const recentNotifications = await this.notificationsRepo.find({
      order: { createdAt: 'DESC' },
      take: 5,
    });

    // 6. 推送设备统计
    const pushDeviceCount = await this.pushDevicesRepo.count();
    const pushDevicesByPlatform = await this.pushDevicesRepo
      .createQueryBuilder('d')
      .select('d.platform', 'platform')
      .addSelect('COUNT(*)', 'count')
      .groupBy('d.platform')
      .getRawMany();

    return {
      timestamp: new Date().toISOString(),
      webPush: {
        configured: webPushConfigured,
        vapidPublicKeyPresent: !!vapidPublicKey,
        vapidPublicKeyPrefix: vapidPublicKey ? vapidPublicKey.slice(0, 20) + '...' : null,
      },
      outbox: outboxStats,
      worker: workerStats,
      pushDevices: {
        total: pushDeviceCount,
        byPlatform: pushDevicesByPlatform,
      },
      recentNotifications: recentNotifications.map(n => ({
        id: n.id,
        type: n.type,
        severity: n.severity,
        title: n.title,
        deliveredPush: n.deliveredPush,
        createdAt: n.createdAt,
      })),
      recentFailures: recentFailures.map(f => ({
        id: f.id,
        messageType: f.messageType,
        status: f.status,
        retryCount: f.retryCount,
        maxRetries: f.maxRetries,
        lastError: f.lastError,
        createdAt: f.createdAt,
        payload: {
          notificationId: f.payload?.notificationId,
          userId: f.payload?.userId,
          title: f.payload?.title,
        },
      })),
    };
  }

  /**
   * 手动触发 Outbox Worker 轮询
   * POST /api/admin/diagnostics/push/trigger-poll
   */
  @Post('diagnostics/push/trigger-poll')
  async triggerOutboxPoll() {
    await this.outboxWorker.triggerPoll();
    const stats = await this.outboxService.getStats();
    return {
      message: 'Poll triggered',
      outboxStats: stats,
    };
  }

  /**
   * 重置 FAILED 状态的消息
   * POST /api/admin/diagnostics/push/reset-failed
   */
  @Post('diagnostics/push/reset-failed')
  async resetFailedOutbox() {
    const count = await this.outboxService.resetFailedMessages();
    return {
      message: `Reset ${count} failed messages to PENDING`,
      resetCount: count,
    };
  }

  /**
   * 获取最近的 Outbox 消息（包括成功的）
   * GET /api/admin/diagnostics/push/outbox-messages
   */
  @Get('diagnostics/push/outbox-messages')
  async getOutboxMessages(
    @Query('status') status?: string,
    @Query('limit') limitStr?: string,
  ) {
    const limit = Math.min(parseInt(limitStr || '20', 10) || 20, 100);
    
    const where: any = {};
    if (status && Object.values(OutboxStatus).includes(status as OutboxStatus)) {
      where.status = status;
    }

    const messages = await this.outboxRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return {
      count: messages.length,
      messages: messages.map(m => ({
        id: m.id,
        messageType: m.messageType,
        status: m.status,
        retryCount: m.retryCount,
        maxRetries: m.maxRetries,
        lastError: m.lastError,
        scheduledAt: m.scheduledAt,
        startedAt: m.startedAt,
        completedAt: m.completedAt,
        processingTimeMs: m.processingTimeMs,
        createdAt: m.createdAt,
        payload: m.payload,
      })),
    };
  }
}
