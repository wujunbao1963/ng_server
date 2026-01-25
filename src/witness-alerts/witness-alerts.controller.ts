import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WitnessAlertsService } from './witness-alerts.service';
import { WitnessAlertType } from './ng-witness-alert.entity';
import { JwtUser } from '../auth/auth.types';

/**
 * Witness Alerts Controller
 * 
 * 端点:
 * - GET    /api/me/witness-alerts              - 获取我的 Witness Alerts
 * - GET    /api/me/witness-alerts/unread-count - 未读数量
 * - POST   /api/me/witness-alerts/:id/read     - 标记已读
 * - POST   /api/me/witness-alerts/read-all     - 全部已读
 * - DELETE /api/me/witness-alerts/:id          - 删除 Alert
 */
@Controller()
@UseGuards(AuthGuard('jwt'))
export class WitnessAlertsController {
  constructor(private readonly witnessAlertsService: WitnessAlertsService) {}

  /**
   * 获取我的 Witness Alert 列表
   */
  @Get('api/me/witness-alerts')
  async listAlerts(
    @Req() req: { user: JwtUser },
    @Query('unreadOnly') unreadOnly?: string,
    @Query('types') types?: string,
    @Query('circleId') circleId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.witnessAlertsService.listForUser(
      req.user.userId,
      {
        unreadOnly: unreadOnly === 'true',
        types: types ? types.split(',') as WitnessAlertType[] : undefined,
        circleId,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      },
    );

    return {
      alerts: result.alerts.map(a => this.formatAlert(a)),
      total: result.total,
      unreadCount: result.unreadCount,
    };
  }

  /**
   * 获取未读数量
   */
  @Get('api/me/witness-alerts/unread-count')
  async getUnreadCount(@Req() req: { user: JwtUser }) {
    const count = await this.witnessAlertsService.getUnreadCount(req.user.userId);
    return { unreadCount: count };
  }

  /**
   * 标记单个 Alert 为已读
   */
  @Post('api/me/witness-alerts/:alertId/read')
  async markAsRead(
    @Param('alertId', new ParseUUIDPipe({ version: '4' })) alertId: string,
    @Req() req: { user: JwtUser },
  ) {
    await this.witnessAlertsService.markAsRead(req.user.userId, alertId);
    return { success: true };
  }

  /**
   * 标记所有 Alert 为已读
   */
  @Post('api/me/witness-alerts/read-all')
  async markAllAsRead(@Req() req: { user: JwtUser }) {
    const count = await this.witnessAlertsService.markAllAsRead(req.user.userId);
    return { success: true, markedCount: count };
  }

  /**
   * 删除 Alert
   */
  @Delete('api/me/witness-alerts/:alertId')
  async deleteAlert(
    @Param('alertId', new ParseUUIDPipe({ version: '4' })) alertId: string,
    @Req() req: { user: JwtUser },
  ) {
    await this.witnessAlertsService.delete(req.user.userId, alertId);
    return { success: true };
  }

  // ==========================================================================
  // Helper
  // ==========================================================================

  private formatAlert(alert: any) {
    return {
      id: alert.id,
      type: alert.type,
      priority: alert.priority,
      title: alert.title,
      body: alert.body,
      circleId: alert.circleId,
      taskId: alert.taskId,
      eventId: alert.eventId,
      actorUserId: alert.actorUserId,
      actorRole: alert.actorRole,
      read: alert.read,
      readAt: alert.readAt?.toISOString?.() ?? alert.readAt,
      data: alert.data,
      createdAt: alert.createdAt?.toISOString?.() ?? alert.createdAt,
    };
  }
}
