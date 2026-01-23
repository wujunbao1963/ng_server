import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RahaActionsService } from './raha-actions.service';
import { ExecuteActionDto, HumanActionResultDto } from './dto';

/**
 * RAHA Actions Controller
 * 
 * Phase 6: Server RAHA Forwarding
 * 
 * Endpoints:
 * - POST /api/circles/:circleId/actions - Execute a RAHA
 * - GET /api/circles/:circleId/devices/:deviceId/edge-url - Get Edge URL
 * - PUT /api/circles/:circleId/devices/:deviceId/edge-url - Set Edge URL
 * 
 * All endpoints require JWT authentication (Mobile App user).
 */
@Controller('/api/circles/:circleId')
@UseGuards(AuthGuard('jwt'))
export class RahaActionsController {
  constructor(private readonly rahaService: RahaActionsService) {}

  /**
   * Execute a Remote Authorized Human Action (RAHA)
   * 
   * POST /api/circles/:circleId/actions
   * 
   * Body:
   * {
   *   "action": "RESOLVE" | "DISMISS" | "DISARM" | "MODE_CHANGE" | "STOP_SIREN",
   *   "eventId": "uuid (optional, required for RESOLVE/DISMISS)",
   *   "params": { "mode": "home" } // for MODE_CHANGE
   * }
   * 
   * Response:
   * {
   *   "requestId": "uuid",
   *   "eventId": "uuid or null",
   *   "accepted": true,
   *   "activeResolver": { "role": "owner", "id": "user-id" },
   *   "ledgerSeqCommitted": 123,
   *   "fromState": "TRIGGERED",
   *   "toState": "RESOLVED"
   * }
   * 
   * Error Response:
   * {
   *   "requestId": "uuid",
   *   "eventId": "uuid or null",
   *   "accepted": false,
   *   "rejectedCode": "RESOLVER_LOCKED",
   *   "rejectedReason": "Another user is handling this event"
   * }
   */
  @Post('actions')
  async executeAction(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Body() dto: ExecuteActionDto,
    @Req() req: any,
    @Req() req: { user: JwtUser },  // 改成明确类型    
  ): Promise<HumanActionResultDto> {
    const userId = req.user?.userId;
    if (!userId) {
      return {
        requestId: '',
        eventId: dto.eventId || null,
        accepted: false,
        rejectedCode: 'UNAUTHORIZED',
        rejectedReason: 'User not authenticated',
      };
    }

    return this.rahaService.executeAction(userId, circleId, dto);
  }

  /**
   * Get Edge URL for a device
   * 
   * GET /api/circles/:circleId/devices/:deviceId/edge-url
   * 
   * Response:
   * {
   *   "deviceId": "uuid",
   *   "edgeUrl": "https://edge.example.com" or null
   * }
   */
  @Get('devices/:deviceId/edge-url')
  async getEdgeUrl(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('deviceId', new ParseUUIDPipe({ version: '4' })) deviceId: string,
    @Req() req: any,
  ): Promise<{ deviceId: string; edgeUrl: string | null }> {
    const userId = req.user?.sub || req.user?.id;
    return this.rahaService.getEdgeUrl(userId, circleId, deviceId);
  }

  /**
   * Set Edge URL for a device
   * 
   * PUT /api/circles/:circleId/devices/:deviceId/edge-url
   * 
   * Body:
   * {
   *   "edgeUrl": "https://edge.example.com"
   * }
   * 
   * Response:
   * {
   *   "deviceId": "uuid",
   *   "edgeUrl": "https://edge.example.com"
   * }
   * 
   * Note: Only circle owner can set Edge URL.
   */
  @Put('devices/:deviceId/edge-url')
  async setEdgeUrl(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('deviceId', new ParseUUIDPipe({ version: '4' })) deviceId: string,
    @Body() body: { edgeUrl: string },
    @Req() req: any,
  ): Promise<{ deviceId: string; edgeUrl: string }> {
    const userId = req.user?.sub || req.user?.id;
    return this.rahaService.updateEdgeUrl(userId, circleId, deviceId, body.edgeUrl);
  }
}
