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
import { CreateCircleDto } from './dto/create-circle.dto';
import { AddCircleMemberDto } from './dto/add-circle-member.dto';
import { UpdateCircleDto } from './dto/update-circle.dto';
import { CirclesService } from './circles.service';
import { JwtUser } from '../auth/auth.types';

/**
 * Circles Controller - 用户侧圈子管理
 *
 * 端点：
 * - POST   /api/circles              - 创建圈子（成为 owner）
 * - GET    /api/circles              - 列出我的圈子
 * - GET    /api/circles/:id          - 圈子详情
 * - PATCH  /api/circles/:id          - 修改圈子（owner only）
 * - DELETE /api/circles/:id          - 删除圈子（owner only）
 * - POST   /api/circles/:id/leave    - 退出圈子（非 owner）
 * - POST   /api/circles/:id/transfer - 转让 owner（owner only）
 * - GET    /api/circles/:id/members  - 列出成员
 * - POST   /api/circles/:id/members  - 添加成员
 */
@Controller('api/circles')
@UseGuards(AuthGuard('jwt'))
export class CirclesController {
  constructor(private readonly circlesService: CirclesService) {}

  /**
   * 创建圈子（当前用户成为 owner）
   */
  @Post()
  async createCircle(@Req() req: { user: JwtUser }, @Body() dto: CreateCircleDto) {
    return this.circlesService.createCircle(req.user.userId, dto.name);
  }

  /**
   * 列出我的圈子
   */
  @Get()
  async listMyCircles(@Req() req: { user: JwtUser }) {
    return this.circlesService.listMyCircles(req.user.userId);
  }

  /**
   * 获取圈子详情
   */
  @Get(':circleId')
  async getCircle(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
  ) {
    return this.circlesService.getCircleDetail(req.user.userId, circleId);
  }

  /**
   * 修改圈子（仅 owner）
   */
  @Patch(':circleId')
  async updateCircle(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Body() dto: UpdateCircleDto,
  ) {
    return this.circlesService.updateCircle(req.user.userId, circleId, dto);
  }

  /**
   * 删除圈子（仅 owner）
   */
  @Delete(':circleId')
  async deleteCircle(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
  ) {
    return this.circlesService.deleteCircle(req.user.userId, circleId);
  }

  /**
   * 退出圈子（非 owner）
   */
  @Post(':circleId/leave')
  async leaveCircle(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
  ) {
    return this.circlesService.leaveCircle(req.user.userId, circleId);
  }

  /**
   * 转让 owner（仅 owner）
   */
  @Post(':circleId/transfer')
  async transferOwnership(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Body() dto: { newOwnerUserId: string },
  ) {
    return this.circlesService.transferOwnership(req.user.userId, circleId, dto.newOwnerUserId);
  }

  /**
   * 列出成员
   */
  @Get(':circleId/members')
  async listMembers(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
  ) {
    return this.circlesService.listMembers(req.user.userId, circleId);
  }

  /**
   * 添加成员
   */
  @Post(':circleId/members')
  async addMember(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Body() dto: AddCircleMemberDto,
  ) {
    return this.circlesService.addMember(req.user.userId, circleId, dto);
  }
}
