import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DeviceKeyAuthGuard } from '../device-auth/device-key-auth.guard';
import { NgDevice } from '../device-auth/ng-device.decorator';
import { NgEdgeDevice } from '../edge-devices/ng-edge-device.entity';
import { CirclesService } from '../circles/circles.service';
import { JwtUser } from '../auth/auth.types';
import {
  RolesService,
  CreateRoleDto,
  UpdateRoleDto,
} from './roles.service';

/**
 * Roles Controller
 * 
 * Endpoints:
 * - GET /api/circles/:circleId/roles - List roles (User auth)
 * - POST /api/circles/:circleId/roles - Create role (User auth, Owner only)
 * - GET /api/circles/:circleId/roles/:roleId - Get role (User auth)
 * - PUT /api/circles/:circleId/roles/:roleId - Update role (User auth, Owner only)
 * - DELETE /api/circles/:circleId/roles/:roleId - Revoke role (User auth, Owner only)
 * - POST /api/circles/:circleId/roles/:roleId/suspend - Suspend role
 * - POST /api/circles/:circleId/roles/:roleId/unsuspend - Unsuspend role
 * - GET /api/circles/:circleId/edge/roles/sync - Sync roles to Edge (Device auth)
 */
@Controller()
export class RolesController {
  constructor(
    private readonly svc: RolesService,
    private readonly circles: CirclesService,
  ) {}

  // ===========================================================================
  // User/App Endpoints (JWT Auth)
  // ===========================================================================

  /**
   * List all roles in a circle.
   */
  @Get('/api/circles/:circleId/roles')
  @UseGuards(AuthGuard('jwt'))
  async listRoles(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
  ) {
    await this.circles.mustBeMember(req.user.userId, circleId);
    const roles = await this.svc.listRoles(circleId);
    return { roles, count: roles.length };
  }

  /**
   * Create a new role assignment.
   */
  @Post('/api/circles/:circleId/roles')
  @UseGuards(AuthGuard('jwt'))
  async createRole(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Body() body: CreateRoleDto,
  ) {
    await this.circles.mustBeMember(req.user.userId, circleId);
    const role = await this.svc.createRole(circleId, req.user.userId, body);
    return { role };
  }

  /**
   * Get a single role.
   */
  @Get('/api/circles/:circleId/roles/:roleId')
  @UseGuards(AuthGuard('jwt'))
  async getRole(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('roleId', new ParseUUIDPipe({ version: '4' })) roleId: string,
  ) {
    await this.circles.mustBeMember(req.user.userId, circleId);
    const role = await this.svc.getRole(circleId, roleId);
    return { role };
  }

  /**
   * Update a role.
   */
  @Put('/api/circles/:circleId/roles/:roleId')
  @UseGuards(AuthGuard('jwt'))
  async updateRole(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('roleId', new ParseUUIDPipe({ version: '4' })) roleId: string,
    @Body() body: UpdateRoleDto,
  ) {
    await this.circles.mustBeMember(req.user.userId, circleId);
    const role = await this.svc.updateRole(circleId, roleId, req.user.userId, body);
    return { role };
  }

  /**
   * Revoke a role.
   */
  @Delete('/api/circles/:circleId/roles/:roleId')
  @UseGuards(AuthGuard('jwt'))
  async revokeRole(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('roleId', new ParseUUIDPipe({ version: '4' })) roleId: string,
  ) {
    await this.circles.mustBeMember(req.user.userId, circleId);
    await this.svc.revokeRole(circleId, roleId, req.user.userId);
    return { ok: true };
  }

  /**
   * Suspend a role.
   */
  @Post('/api/circles/:circleId/roles/:roleId/suspend')
  @UseGuards(AuthGuard('jwt'))
  async suspendRole(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('roleId', new ParseUUIDPipe({ version: '4' })) roleId: string,
  ) {
    await this.circles.mustBeMember(req.user.userId, circleId);
    const role = await this.svc.suspendRole(circleId, roleId, req.user.userId);
    return { role };
  }

  /**
   * Unsuspend a role.
   */
  @Post('/api/circles/:circleId/roles/:roleId/unsuspend')
  @UseGuards(AuthGuard('jwt'))
  async unsuspendRole(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('roleId', new ParseUUIDPipe({ version: '4' })) roleId: string,
  ) {
    await this.circles.mustBeMember(req.user.userId, circleId);
    const role = await this.svc.unsuspendRole(circleId, roleId, req.user.userId);
    return { role };
  }

  /**
   * Verify PIN.
   */
  @Post('/api/circles/:circleId/roles/verify-pin')
  @UseGuards(AuthGuard('jwt'))
  async verifyPin(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Body() body: { userId: string; pin: string },
  ) {
    await this.circles.mustBeMember(req.user.userId, circleId);
    const valid = await this.svc.verifyPin(circleId, body.userId, body.pin);
    return { valid };
  }

  // ===========================================================================
  // Edge Device Endpoints (Device Key Auth)
  // ===========================================================================

  /**
   * Sync roles to Edge device.
   * 
   * GET /api/circles/:circleId/edge/roles/sync?sinceVersion=5
   */
  @Get('/api/circles/:circleId/edge/roles/sync')
  @UseGuards(DeviceKeyAuthGuard)
  async syncRoles(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @NgDevice() device: NgEdgeDevice,
    @Query('sinceVersion') sinceVersionStr?: string,
  ) {
    if (device.circleId !== circleId) {
      return { ok: false, error: 'Device not authorized for this circle' };
    }

    const sinceVersion = parseInt(sinceVersionStr ?? '0', 10) || 0;
    const result = await this.svc.getRolesForSync(circleId, sinceVersion);

    return {
      ok: true,
      ...result,
    };
  }
}
