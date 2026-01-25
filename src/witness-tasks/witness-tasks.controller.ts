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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as crypto from 'crypto';
import {
  WitnessTasksService,
  CreateTaskDto,
  ClaimTaskDto,
  ArriveDto,
  SubmitDto,
  RiskAbortDto,
} from './witness-tasks.service';
import { JwtUser } from '../auth/auth.types';

// Multer 文件类型
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
}

// ============================================================================
// 证据上传配置
// ============================================================================

const UPLOAD_DIR = process.env.EVIDENCE_UPLOAD_DIR || './uploads/evidence';

// 确保上传目录存在
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 存储配置
const evidenceStorage = diskStorage({
  destination: (req, file, cb) => {
    const now = new Date();
    const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
    const fullPath = join(UPLOAD_DIR, datePath);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const taskId = (req.params as any).taskId || 'unknown';
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const ext = extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${taskId}_${uniqueSuffix}${ext}`);
  },
});

// 文件类型过滤
const fileFilter = (req: any, file: { mimetype: string; originalname: string }, cb: any) => {
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/webm',
    'audio/aac', 'audio/mpeg', 'audio/mp4',
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
  }
};

/**
 * Witness Tasks Controller
 * 
 * Owner/Caretaker 操作:
 * - POST   /api/circles/:circleId/witness-tasks              - 创建任务
 * - POST   /api/circles/:circleId/witness-tasks/:id/offer    - 发布任务
 * - POST   /api/circles/:circleId/witness-tasks/:id/close    - 关闭任务
 * - POST   /api/circles/:circleId/witness-tasks/:id/cancel   - 取消任务
 * 
 * Witness / Acting Owner 操作:
 * - GET    /api/circles/:circleId/witness-tasks/available    - 可领取的任务
 * - POST   /api/circles/:circleId/witness-tasks/:id/claim    - 领取任务
 * - POST   /api/circles/:circleId/witness-tasks/:id/arrive   - 到达确认
 * - POST   /api/circles/:circleId/witness-tasks/:id/submit   - 提交报告
 * - POST   /api/circles/:circleId/witness-tasks/:id/risk-abort - 风险退出 (E3)
 * - POST   /api/circles/:circleId/witness-tasks/:id/evidence - 上传证据 (NEW)
 * 
 * 通用:
 * - GET    /api/circles/:circleId/witness-tasks              - 任务列表
 * - GET    /api/circles/:circleId/witness-tasks/:id          - 任务详情
 * - GET    /api/me/witness-tasks                             - 我的任务 (Witness)
 */
@Controller()
@UseGuards(AuthGuard('jwt'))
export class WitnessTasksController {
  constructor(private readonly tasksService: WitnessTasksService) {}

  // ==========================================================================
  // Circle 范围的任务端点
  // ==========================================================================

  /**
   * 创建任务 (Owner/Caretaker)
   */
  @Post('api/circles/:circleId/witness-tasks')
  async createTask(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Body() dto: CreateTaskDto,
    @Req() req: { user: JwtUser },
  ) {
    const task = await this.tasksService.createTask(req.user.userId, circleId, dto);
    return { task: this.formatTask(task) };
  }

  /**
   * 列出任务
   */
  @Get('api/circles/:circleId/witness-tasks')
  async listTasks(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Req() req?: { user: JwtUser },
  ) {
    const result = await this.tasksService.listTasks(req!.user.userId, circleId, {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return {
      tasks: result.tasks.map(t => this.formatTask(t)),
      total: result.total,
    };
  }

  /**
   * 可领取的任务 (Witness)
   */
  @Get('api/circles/:circleId/witness-tasks/available')
  async listAvailableTasks(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Req() req: { user: JwtUser },
  ) {
    const tasks = await this.tasksService.listAvailableTasks(req.user.userId, circleId);
    return { tasks: tasks.map(t => this.formatTask(t)) };
  }

  /**
   * 任务详情
   */
  @Get('api/circles/:circleId/witness-tasks/:taskId')
  async getTask(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string,
    @Req() req: { user: JwtUser },
  ) {
    const task = await this.tasksService.getTask(req.user.userId, circleId, taskId);
    return { task: this.formatTask(task) };
  }

  /**
   * 发布任务 (Owner/Caretaker)
   */
  @Post('api/circles/:circleId/witness-tasks/:taskId/offer')
  async offerTask(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string,
    @Req() req: { user: JwtUser },
  ) {
    const task = await this.tasksService.offerTask(req.user.userId, circleId, taskId);
    return { task: this.formatTask(task) };
  }

  /**
   * 领取任务 (Witness)
   */
  @Post('api/circles/:circleId/witness-tasks/:taskId/claim')
  async claimTask(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string,
    @Body() dto: ClaimTaskDto,
    @Req() req: { user: JwtUser },
  ) {
    const task = await this.tasksService.claimTask(req.user.userId, circleId, taskId, dto);
    return { task: this.formatTask(task) };
  }

  /**
   * 到达确认 (Witness)
   */
  @Post('api/circles/:circleId/witness-tasks/:taskId/arrive')
  async arriveAtTask(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string,
    @Body() dto: ArriveDto,
    @Req() req: { user: JwtUser },
  ) {
    const task = await this.tasksService.arriveAtTask(req.user.userId, circleId, taskId, dto);
    return { task: this.formatTask(task) };
  }

  /**
   * 提交报告 (Witness)
   */
  @Post('api/circles/:circleId/witness-tasks/:taskId/submit')
  async submitTask(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string,
    @Body() dto: SubmitDto,
    @Req() req: { user: JwtUser },
  ) {
    const task = await this.tasksService.submitTask(req.user.userId, circleId, taskId, dto);
    return { task: this.formatTask(task) };
  }

  /**
   * 风险退出 (Witness) - E3
   */
  @Post('api/circles/:circleId/witness-tasks/:taskId/risk-abort')
  async riskAbortTask(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string,
    @Body() dto: RiskAbortDto,
    @Req() req: { user: JwtUser },
  ) {
    const task = await this.tasksService.riskAbortTask(req.user.userId, circleId, taskId, dto);
    return { task: this.formatTask(task) };
  }

  /**
   * 上传证据 (Witness / Acting Owner)
   * 
   * POST /api/circles/:circleId/witness-tasks/:taskId/evidence
   * Content-Type: multipart/form-data
   * Body: file (binary)
   * 
   * 允许状态: claimed, arrived
   * 限制: 最大 10MB，最多 10 个文件
   */
  @Post('api/circles/:circleId/witness-tasks/:taskId/evidence')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: evidenceStorage,
      fileFilter: fileFilter,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadEvidence(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string,
    @UploadedFile() file: MulterFile,
    @Req() req: { user: JwtUser },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const evidence = await this.tasksService.addEvidence(
      req.user.userId,
      circleId,
      taskId,
      {
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
      },
    );

    return { success: true, evidence };
  }

  /**
   * 关闭任务 (Owner/Caretaker)
   */
  @Post('api/circles/:circleId/witness-tasks/:taskId/close')
  async closeTask(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string,
    @Req() req: { user: JwtUser },
  ) {
    const task = await this.tasksService.closeTask(req.user.userId, circleId, taskId);
    return { task: this.formatTask(task) };
  }

  /**
   * 取消任务 (Owner/Caretaker)
   */
  @Post('api/circles/:circleId/witness-tasks/:taskId/cancel')
  async cancelTask(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string,
    @Body() dto: { reason?: string },
    @Req() req: { user: JwtUser },
  ) {
    const task = await this.tasksService.cancelTask(req.user.userId, circleId, taskId, dto.reason);
    return { task: this.formatTask(task) };
  }

  // ==========================================================================
  // 用户范围的任务端点
  // ==========================================================================

  /**
   * 我的任务 (Witness)
   */
  @Get('api/me/witness-tasks')
  async listMyTasks(@Req() req: { user: JwtUser }) {
    const tasks = await this.tasksService.listMyTasks(req.user.userId);
    return { tasks: tasks.map(t => this.formatTask(t)) };
  }

  // ==========================================================================
  // Helper
  // ==========================================================================

  private formatTask(task: any) {
    return {
      id: task.id,
      circleId: task.circleId,
      eventId: task.eventId,
      title: task.title,
      description: task.description,
      // === E3: 协助请求字段 ===
      purpose: task.purpose,
      targetEntry: task.targetEntry,
      // ========================
      status: task.status,
      creatorUserId: task.creatorUserId,
      creatorRole: task.creatorRole,
      witnessUserId: task.witnessUserId,
      createdAt: task.createdAt?.toISOString?.() ?? task.createdAt,
      offeredAt: task.offeredAt?.toISOString?.() ?? task.offeredAt,
      claimedAt: task.claimedAt?.toISOString?.() ?? task.claimedAt,
      arrivedAt: task.arrivedAt?.toISOString?.() ?? task.arrivedAt,
      submittedAt: task.submittedAt?.toISOString?.() ?? task.submittedAt,
      closedAt: task.closedAt?.toISOString?.() ?? task.closedAt,
      canceledAt: task.canceledAt?.toISOString?.() ?? task.canceledAt,
      expiresAt: task.expiresAt?.toISOString?.() ?? task.expiresAt,
      proximityVerified: task.proximityVerified,
      proximityFailureReason: task.proximityFailureReason,
      // === E3: 结构化结论 ===
      conclusion: task.conclusion,
      conclusionNote: task.conclusionNote,
      // ======================
      submissionNotes: task.submissionNotes,
      submissionPhotos: task.submissionPhotos,
      cancelReason: task.cancelReason,
      // === E3: 风险退出 ===
      riskAbortReason: task.riskAbortReason,
      riskAbortedAt: task.riskAbortedAt?.toISOString?.() ?? task.riskAbortedAt,
    };
  }
}
