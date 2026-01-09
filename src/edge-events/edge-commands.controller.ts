import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DeviceKeyAuthGuard } from '../device-auth/device-key-auth.guard';
import { EdgeCommandsService } from './edge-commands.service';

/**
 * Edge 命令 API
 * 
 * 提供 Server → Edge 的命令下发通道
 * Edge 通过轮询获取待执行命令
 * 
 * 所有接口使用 DeviceKeyAuth 认证 (与 edge-events 相同)
 */
@Controller('/api/circles/:circleId/edge/commands')
export class EdgeCommandsController {
  constructor(private readonly commandsService: EdgeCommandsService) {}

  /**
   * Edge 轮询获取待执行命令
   * 
   * GET /api/circles/:circleId/edge/commands/pending
   * 
   * Query params:
   *   - edgeInstanceId: Edge 设备 ID
   *   - limit: 最大返回数量 (默认 10)
   * 
   * Response:
   * {
   *   commands: [
   *     {
   *       commandId: "uuid",
   *       commandType: "resolve",
   *       commandPayload: { entryPointId: "ep_back" },
   *       eventId: "inc_xxx",
   *       createdAt: "2026-01-09T...",
   *       expiresAt: "2026-01-09T..."
   *     }
   *   ]
   * }
   */
  @Get('pending')
  @UseGuards(DeviceKeyAuthGuard)
  async getPendingCommands(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Query('edgeInstanceId') edgeInstanceId: string,
    @Query('limit') limitStr?: string,
  ) {
    if (!edgeInstanceId) {
      return {
        error: 'Missing edgeInstanceId query parameter',
        commands: [],
      };
    }

    const limit = limitStr ? Math.min(parseInt(limitStr, 10) || 10, 50) : 10;
    const commands = await this.commandsService.getPendingCommands(
      circleId,
      edgeInstanceId,
      limit,
    );

    return { commands };
  }

  /**
   * Edge 确认收到命令
   * 
   * POST /api/circles/:circleId/edge/commands/:commandId/ack
   * 
   * Body:
   * {
   *   edgeInstanceId: "edge-main-001"
   * }
   * 
   * Response:
   * {
   *   success: true,
   *   message: "Acknowledged"
   * }
   */
  @Post(':commandId/ack')
  @UseGuards(DeviceKeyAuthGuard)
  async acknowledgeCommand(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('commandId', new ParseUUIDPipe({ version: '4' })) commandId: string,
    @Body() body: { edgeInstanceId: string },
  ) {
    if (!body.edgeInstanceId) {
      return {
        success: false,
        message: 'Missing edgeInstanceId in body',
      };
    }

    return this.commandsService.acknowledgeCommand(commandId, body.edgeInstanceId);
  }

  /**
   * Edge 报告命令执行完成
   * 
   * POST /api/circles/:circleId/edge/commands/:commandId/complete
   * 
   * Body:
   * {
   *   edgeInstanceId: "edge-main-001",
   *   success: true,
   *   message: "Resolved ep_back successfully"
   * }
   * 
   * Response:
   * {
   *   success: true,
   *   message: "Recorded"
   * }
   */
  @Post(':commandId/complete')
  @UseGuards(DeviceKeyAuthGuard)
  async completeCommand(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('commandId', new ParseUUIDPipe({ version: '4' })) commandId: string,
    @Body() body: { edgeInstanceId: string; success: boolean; message?: string },
  ) {
    if (!body.edgeInstanceId) {
      return {
        success: false,
        message: 'Missing edgeInstanceId in body',
      };
    }

    return this.commandsService.completeCommand(commandId, body.edgeInstanceId, {
      success: body.success,
      message: body.message,
    });
  }
}
