import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateCircleDto } from './dto/create-circle.dto';
import { AddCircleMemberDto } from './dto/add-circle-member.dto';
import { UpdateCircleDto } from './dto/update-circle.dto';
import { CirclesService } from './circles.service';
import { JwtUser } from '../auth/auth.types';

/**
 * Circles Controller - Owner 管理 Circle 和成员
 *
 * Circle 管理:
 * - POST   /api/circles              - 创建 Circle (需要 canCreateCircle 权限)
 * - GET    /api/circles              - 列出我的 Circles
 * - GET    /api/circles/:id          - Circle 详情
 * - PUT    /api/circles/:id          - 修改 Circle (owner only)
 * - DELETE /api/circles/:id          - 删除 Circle (owner only)
 * 
 * 成员管理:
 * - GET    /api/circles/:id/members        - 列出成员
 * - POST   /api/circles/:id/members        - 添加成员 (owner only)
 * - DELETE /api/circles/:id/members/:uid   - 移除成员 (owner only)
 * 
 * 其他操作:
 * - POST   /api/circles/:id/leave          - 退出 Circle (非 owner)
 * - POST   /api/circles/:id/transfer       - 转让 owner (owner only)
 */
@Controller('api/circles')
@UseGuards(AuthGuard('jwt'))
export class CirclesController {
  constructor(private readonly circlesService: CirclesService) {}

  // ==========================================================================
  // Circle CRUD
  // ==========================================================================

  /**
   * 创建 Circle
   * 
   * POST /api/circles
   * { name, propertyType?, address?, city?, state?, postalCode?, country?, latitude?, longitude? }
   * 
   * 要求: 用户必须有 canCreateCircle 权限
   */
  @Post()
  async createCircle(@Req() req: { user: JwtUser }, @Body() dto: CreateCircleDto) {
    return this.circlesService.createCircle(req.user.userId, dto);
  }

  /**
   * 列出我的 Circles
   * 
   * GET /api/circles
   */
  @Get()
  async listMyCircles(@Req() req: { user: JwtUser }) {
    return this.circlesService.listMyCircles(req.user.userId);
  }

  /**
   * 获取 Circle 详情
   * 
   * GET /api/circles/:circleId
   */
  @Get(':circleId')
  async getCircle(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
  ) {
    return this.circlesService.getCircleDetail(req.user.userId, circleId);
  }

  /**
   * 修改 Circle (owner only)
   * 
   * PUT /api/circles/:circleId
   * PATCH /api/circles/:circleId
   */
  @Put(':circleId')
  async updateCircle(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Body() dto: UpdateCircleDto,
  ) {
    return this.circlesService.updateCircle(req.user.userId, circleId, dto);
  }

  @Patch(':circleId')
  async patchCircle(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Body() dto: UpdateCircleDto,
  ) {
    return this.circlesService.updateCircle(req.user.userId, circleId, dto);
  }

  /**
   * 删除 Circle (owner only)
   * 
   * DELETE /api/circles/:circleId
   */
  @Delete(':circleId')
  async deleteCircle(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
  ) {
    return this.circlesService.deleteCircle(req.user.userId, circleId);
  }

  // ==========================================================================
  // Member Management
  // ==========================================================================

  /**
   * 列出成员
   * 
   * GET /api/circles/:circleId/members
   */
  @Get(':circleId/members')
  async listMembers(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
  ) {
    return this.circlesService.listMembers(req.user.userId, circleId);
  }

  /**
   * 添加成员 (owner only)
   * 
   * POST /api/circles/:circleId/members
   * { email, role, validUntil? }
   */
  @Post(':circleId/members')
  async addMember(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Body() dto: AddCircleMemberDto,
  ) {
    return this.circlesService.addMember(req.user.userId, circleId, dto);
  }

  /**
   * 移除成员 (owner only)
   * 
   * DELETE /api/circles/:circleId/members/:userId
   */
  @Delete(':circleId/members/:userId')
  async removeMember(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    return this.circlesService.removeMember(req.user.userId, circleId, userId);
  }

  // ==========================================================================
  // Other Operations
  // ==========================================================================

  /**
   * 退出 Circle (非 owner)
   * 
   * POST /api/circles/:circleId/leave
   */
  @Post(':circleId/leave')
  async leaveCircle(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
  ) {
    return this.circlesService.leaveCircle(req.user.userId, circleId);
  }

  /**
   * 转让 owner (owner only)
   * 
   * POST /api/circles/:circleId/transfer
   * { newOwnerUserId }
   */
  @Post(':circleId/transfer')
  async transferOwnership(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Body() dto: { newOwnerUserId: string },
  ) {
    return this.circlesService.transferOwnership(req.user.userId, circleId, dto.newOwnerUserId);
  }
}
