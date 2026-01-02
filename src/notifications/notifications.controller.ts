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
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtUser } from '../auth/auth.types';
import { NgHttpError, NgErrorCodes } from '../common/errors/ng-http-error';
import { NotificationsService } from './notifications.service';

@Controller('/v1')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  // =========================================================================
  // Push Device Endpoints
  // =========================================================================

  /**
   * 6.1 Register Push Device
   * POST /v1/push/devices
   */
  @Post('push/devices')
  @UseGuards(AuthGuard('jwt'))
  async registerPushDevice(@Req() req: { user: JwtUser }, @Body() body: any) {
    const { platform, token, deviceId, appVersion, locale, timezone } = body;

    // Validation
    if (!platform || !['ios', 'android', 'web'].includes(platform)) {
      throw new NgHttpError({
        statusCode: 400,
        error: 'Bad Request',
        code: NgErrorCodes.VALIDATION_ERROR,
        message: 'Invalid platform. Must be ios, android, or web.',
        timestamp: new Date().toISOString(),
      });
    }

    if (!token || typeof token !== 'string' || token.length < 10) {
      throw new NgHttpError({
        statusCode: 400,
        error: 'Bad Request',
        code: NgErrorCodes.VALIDATION_ERROR,
        message: 'Invalid token.',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await this.svc.registerPushDevice({
      userId: req.user.userId,
      platform,
      token,
      deviceId,
      appVersion,
      locale,
      timezone,
    });

    return {
      ok: true,
      device: result,
    };
  }

  /**
   * 6.2 Unregister Push Device
   * DELETE /v1/push/devices/:pushDeviceId
   */
  @Delete('push/devices/:pushDeviceId')
  @UseGuards(AuthGuard('jwt'))
  async unregisterPushDevice(
    @Req() req: { user: JwtUser },
    @Param('pushDeviceId', new ParseUUIDPipe({ version: '4' })) pushDeviceId: string,
  ) {
    const deleted = await this.svc.unregisterPushDevice(req.user.userId, pushDeviceId);

    if (!deleted) {
      throw new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: NgErrorCodes.NOT_FOUND,
        message: 'Push device not found.',
        timestamp: new Date().toISOString(),
      });
    }

    return { ok: true };
  }

  // =========================================================================
  // Notifications Endpoints
  // =========================================================================

  /**
   * 6.3 List Notifications (In-App Inbox)
   * GET /v1/notifications
   */
  @Get('notifications')
  @UseGuards(AuthGuard('jwt'))
  async listNotifications(
    @Req() req: { user: JwtUser },
    @Query('cursor') cursor?: string,
    @Query('limit') limitStr?: string,
  ) {
    const limit = Math.min(Math.max(parseInt(limitStr || '20', 10) || 20, 1), 50);
    const result = await this.svc.listNotifications(req.user.userId, limit, cursor);
    return result;
  }

  /**
   * 6.4 Get Notification Detail
   * GET /v1/notifications/:notificationId
   */
  @Get('notifications/:notificationId')
  @UseGuards(AuthGuard('jwt'))
  async getNotification(
    @Req() req: { user: JwtUser },
    @Param('notificationId', new ParseUUIDPipe({ version: '4' })) notificationId: string,
  ) {
    const notification = await this.svc.getNotification(req.user.userId, notificationId);

    if (!notification) {
      throw new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: NgErrorCodes.NOT_FOUND,
        message: 'Notification not found.',
        timestamp: new Date().toISOString(),
      });
    }

    return { notification: notification.toResponse() };
  }

  /**
   * 6.5 Mark Read
   * PATCH /v1/notifications/:notificationId/read
   */
  @Patch('notifications/:notificationId/read')
  @UseGuards(AuthGuard('jwt'))
  async markRead(
    @Req() req: { user: JwtUser },
    @Param('notificationId', new ParseUUIDPipe({ version: '4' })) notificationId: string,
    @Body() body: { read?: boolean },
  ) {
    if (body.read === false) {
      // 不支持取消已读
      return { ok: true, status: { readAt: null } };
    }

    const result = await this.svc.markRead(req.user.userId, notificationId);

    if (!result) {
      throw new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: NgErrorCodes.NOT_FOUND,
        message: 'Notification not found.',
        timestamp: new Date().toISOString(),
      });
    }

    return { ok: true, status: result };
  }

  /**
   * 6.6 Acknowledge Notification
   * PATCH /v1/notifications/:notificationId/ack
   */
  @Patch('notifications/:notificationId/ack')
  @UseGuards(AuthGuard('jwt'))
  async acknowledgeNotification(
    @Req() req: { user: JwtUser },
    @Param('notificationId', new ParseUUIDPipe({ version: '4' })) notificationId: string,
    @Body() body: { ack?: boolean },
  ) {
    if (body.ack === false) {
      // 不支持取消确认
      return { ok: true, status: { ackedAt: null } };
    }

    const result = await this.svc.markAcked(req.user.userId, notificationId);

    if (!result) {
      throw new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: NgErrorCodes.NOT_FOUND,
        message: 'Notification not found.',
        timestamp: new Date().toISOString(),
      });
    }

    return { ok: true, status: result };
  }
}
