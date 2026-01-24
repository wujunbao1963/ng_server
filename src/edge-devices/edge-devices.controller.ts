import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EdgeDevicesService } from './edge-devices.service';
import { RegisterEdgeDeviceDto } from './dto/register-edge-device.dto';
import { UpdateEdgeDeviceDto } from './dto/update-edge-device.dto';
import { JwtUser } from '../auth/auth.types';
import { ContractsValidatorService } from '../common/contracts/contracts-validator.service';
import { makeNotFoundError, makeValidationError } from '../common/errors/ng-http-error';

/**
 * Edge Devices Controller
 * 
 * 绑定入口 (Owner):
 * - POST   /api/circles/:circleId/edge/generate-binding  - 生成绑定信息
 * - GET    /api/circles/:circleId/edge/binding-status    - 查看绑定状态
 * - DELETE /api/circles/:circleId/edge/binding           - 撤销绑定
 * 
 * 设备管理:
 * - GET    /api/circles/:circleId/edge/devices           - 列出设备
 * - POST   /api/circles/:circleId/edge/devices           - 注册设备 (保留兼容)
 * - PATCH  /api/circles/:circleId/edge/devices/:id       - 启用/禁用
 * - POST   /api/circles/:circleId/edge/devices/:id/rotate-key - 轮换密钥
 */
@Controller('api/circles/:circleId/edge')
@UseGuards(AuthGuard('jwt'))
export class EdgeDevicesController {
  constructor(
    private readonly edgeDevices: EdgeDevicesService,
    private readonly contracts: ContractsValidatorService,
  ) {}

  // ==========================================================================
  // 绑定入口 (Owner)
  // ==========================================================================

  /**
   * 生成 Edge 绑定信息
   * 
   * POST /api/circles/:circleId/edge/generate-binding
   * 
   * Response:
   * {
   *   circleId, circleName, deviceId, deviceKey, serverUrl,
   *   generatedAt, expiresAt
   * }
   * 
   * Owner 将此信息输入到 Edge Manager UI 完成绑定
   */
  @Post('generate-binding')
  async generateBinding(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Req() req: { user: JwtUser },
  ) {
    return this.edgeDevices.generateBinding(req.user.userId, circleId);
  }

  /**
   * 获取绑定状态
   * 
   * GET /api/circles/:circleId/edge/binding-status
   * 
   * Response:
   * {
   *   hasBoundDevice: boolean,
   *   device: { deviceId, name, enabled, pairedAt, lastSeenAt, bindingStatus } | null
   * }
   */
  @Get('binding-status')
  async getBindingStatus(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Req() req: { user: JwtUser },
  ) {
    return this.edgeDevices.getBindingStatus(req.user.userId, circleId);
  }

  /**
   * 撤销绑定
   * 
   * DELETE /api/circles/:circleId/edge/binding
   * 
   * Response:
   * { revoked: true, deviceId }
   */
  @Delete('binding')
  async revokeBinding(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Req() req: { user: JwtUser },
  ) {
    return this.edgeDevices.revokeBinding(req.user.userId, circleId);
  }

  // ==========================================================================
  // 设备管理 (原有端点保留)
  // ==========================================================================

  /**
   * 注册设备 (保留兼容)
   */
  @Post('devices')
  async register(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Body() body: RegisterEdgeDeviceDto,
    @Req() req: { user: JwtUser },
  ) {
    const vr = this.contracts.validateDeviceRegisterRequest(body);
    if (!vr.ok) throw makeValidationError(vr.errors);

    const out = await this.edgeDevices.register(req.user.userId, circleId, body);
    const vo = this.contracts.validateDeviceRegisterResponse(out);
    if (!vo.ok) throw makeValidationError(vo.errors);
    return out;
  }

  /**
   * 列出设备
   */
  @Get('devices')
  async list(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Req() req: { user: JwtUser },
  ) {
    return this.edgeDevices.list(req.user.userId, circleId);
  }

  /**
   * 启用/禁用设备
   */
  @Patch('devices/:deviceId')
  async setEnabled(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('deviceId', new ParseUUIDPipe({ version: '4' })) deviceId: string,
    @Body() body: UpdateEdgeDeviceDto,
    @Req() req: { user: JwtUser },
  ) {
    try {
      return await this.edgeDevices.setEnabled(req.user.userId, circleId, deviceId, body.enabled);
    } catch (e: any) {
      if (e?.message === 'DEVICE_NOT_FOUND') throw makeNotFoundError('Device not found');
      throw e;
    }
  }

  /**
   * 轮换密钥
   */
  @Post('devices/:deviceId/rotate-key')
  async rotateKey(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('deviceId', new ParseUUIDPipe({ version: '4' })) deviceId: string,
    @Req() req: { user: JwtUser },
  ) {
    try {
      return await this.edgeDevices.rotateKey(req.user.userId, circleId, deviceId);
    } catch (e: any) {
      if (e?.message === 'DEVICE_NOT_FOUND') throw makeNotFoundError('Device not found');
      throw e;
    }
  }
}
