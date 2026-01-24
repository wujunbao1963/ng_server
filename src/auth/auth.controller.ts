import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { DevLoginDto } from './dto/dev-login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtUser } from './auth.types';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ===========================================================================
  // 用户注册
  // ===========================================================================

  /**
   * 用户注册 (需要邀请码)
   * 
   * POST /api/auth/register
   * { email, password, displayName?, inviteCode }
   * 
   * Response:
   * { accessToken, user: { id, email, displayName, isAdmin, canCreateCircle } }
   */
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(
      dto.email,
      dto.password,
      dto.displayName,
      dto.inviteCode,
    );
  }

  // ===========================================================================
  // 用户登录
  // ===========================================================================

  /**
   * 用户登录
   * 
   * POST /api/auth/login
   * { email, password }
   * 
   * Response:
   * { accessToken, user: { id, email, displayName, isAdmin, canCreateCircle } }
   */
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  // ===========================================================================
  // Dev Login (保留用于测试)
  // ===========================================================================

  /**
   * Dev-only login for local tests and early integration.
   * Creates/updates a user record and returns a signed JWT.
   * 
   * POST /api/auth/dev/login
   */
  @Post('dev/login')
  async devLogin(@Body() dto: DevLoginDto) {
    return this.authService.devLogin(dto.email, dto.displayName);
  }

  // ===========================================================================
  // 获取当前用户信息
  // ===========================================================================

  /**
   * 获取当前用户信息，包含所有 Circle 角色
   * 
   * GET /api/auth/me
   * 
   * Response:
   * {
   *   id, email, displayName, isAdmin, canCreateCircle,
   *   circles: [{ circleId, circleName, role, validFrom, validUntil, suspended }]
   * }
   */
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMe(@Req() req: { user: JwtUser }) {
    return this.authService.getCurrentUser(req.user.userId);
  }
}

// ===========================================================================
// Circle Auth Controller (分离以保持 URL 结构清晰)
// ===========================================================================

@Controller('api/circles')
export class CircleAuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 获取当前用户在特定 Circle 的角色
   * 
   * GET /api/circles/:circleId/my-role
   * 
   * Response:
   * { role: "owner" | "caretaker" | "acting_owner" | "witness" | null, ... }
   */
  @Get(':circleId/my-role')
  @UseGuards(AuthGuard('jwt'))
  async getMyRole(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
  ) {
    return this.authService.getMyRoleInCircle(req.user.userId, circleId);
  }
}
