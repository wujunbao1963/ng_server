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
import { OsheService, CreateOsheDto, EventContext } from './oshe.service';
import { JwtUser } from '../auth/auth.types';

/**
 * OSHE (On-Scene Human Evidence) Controller
 * 
 * 实现: ng_l2_on_scene_human_evidence_min_spec.md
 * 
 * API:
 * - POST /api/circles/:circleId/events/:eventId/oshe     - 创建 OSHE
 * - GET  /api/circles/:circleId/events/:eventId/oshe     - 列出事件 OSHE
 * - GET  /api/circles/:circleId/events/:eventId/oshe/:id - OSHE 详情
 * - GET  /api/circles/:circleId/events/:eventId/oshe/manifest - IncidentPacket 格式
 */
@Controller('api/circles/:circleId/events/:eventId/oshe')
@UseGuards(AuthGuard('jwt'))
export class OsheController {
  constructor(private readonly osheService: OsheService) {}

  /**
   * 创建 OSHE
   * 
   * POST /api/circles/:circleId/events/:eventId/oshe
   * 
   * Body:
   * {
   *   mediaType: "video" | "image" | "audio",
   *   capturedAt: "ISO8601",
   *   afterThreatState: "TRIGGERED" | "RESOLVED",
   *   fileUrl: "https://...",
   *   fileName?: "photo.jpg",
   *   fileSizeBytes?: 1234567,
   *   latitude?: 51.0447,
   *   longitude?: -114.0719,
   *   accuracy?: 10,
   *   presenceVerificationDegraded?: false,
   *   notes?: "Front door appears secure"
   * }
   * 
   * 注意: eventContext 需要从事件系统获取，这里简化处理
   */
  @Post()
  async createOshe(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('eventId', new ParseUUIDPipe({ version: '4' })) eventId: string,
    @Body() body: CreateOsheDto & { eventThreatState?: string; eventStateChangedAt?: string },
    @Req() req: { user: JwtUser },
  ) {
    // 构建 EventContext
    // 注意: 生产环境应该从 Event Service 获取真实的事件状态
    // 这里简化处理，允许客户端声明状态
    const eventContext: EventContext = {
      eventId,
      threatState: (body.eventThreatState as 'TRIGGERED' | 'RESOLVED') ?? body.afterThreatState,
      stateChangedAt: body.eventStateChangedAt ? new Date(body.eventStateChangedAt) : new Date(),
    };

    const oshe = await this.osheService.createOshe(
      req.user.userId,
      circleId,
      { ...body, eventId },
      eventContext,
    );

    return { oshe: this.formatOshe(oshe) };
  }

  /**
   * 列出事件的 OSHE
   * 
   * GET /api/circles/:circleId/events/:eventId/oshe
   */
  @Get()
  async listOshe(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('eventId', new ParseUUIDPipe({ version: '4' })) eventId: string,
    @Req() req: { user: JwtUser },
  ) {
    const items = await this.osheService.listByEvent(req.user.userId, circleId, eventId);
    return { 
      osheItems: items.map(i => this.formatOshe(i)),
      total: items.length,
    };
  }

  /**
   * 获取 IncidentPacketManifest 格式 (§8)
   * 
   * GET /api/circles/:circleId/events/:eventId/oshe/manifest
   */
  @Get('manifest')
  async getManifest(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('eventId', new ParseUUIDPipe({ version: '4' })) eventId: string,
    @Req() req: { user: JwtUser },
  ) {
    // 先验证用户权限
    await this.osheService.listByEvent(req.user.userId, circleId, eventId);
    
    const items = await this.osheService.getManifestItems(circleId, eventId);
    return {
      eventId,
      osheItems: items,
      count: items.length,
      note: '⚠️ Human On-Scene Evidence - Supplemental only',
    };
  }

  /**
   * 获取 OSHE 详情
   * 
   * GET /api/circles/:circleId/events/:eventId/oshe/:osheId
   */
  @Get(':osheId')
  async getOshe(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('eventId', new ParseUUIDPipe({ version: '4' })) eventId: string,
    @Param('osheId', new ParseUUIDPipe({ version: '4' })) osheId: string,
    @Req() req: { user: JwtUser },
  ) {
    const oshe = await this.osheService.getOshe(req.user.userId, circleId, eventId, osheId);
    return { oshe: this.formatOshe(oshe) };
  }

  // ==========================================================================
  // Helper
  // ==========================================================================

  private formatOshe(oshe: any) {
    return {
      id: oshe.id,
      circleId: oshe.circleId,
      eventId: oshe.eventId,
      evidenceClass: oshe.evidenceClass,
      mediaType: oshe.mediaType,
      capturedAt: oshe.capturedAt?.toISOString?.() ?? oshe.capturedAt,
      capturedByUserId: oshe.capturedByUserId,
      capturedByRole: oshe.capturedByRole,
      afterThreatState: oshe.afterThreatState,
      source: 'human_on_scene',
      auditWeight: 'supplemental',
      presenceVerified: oshe.presenceVerified,
      presenceVerificationDegraded: oshe.presenceVerificationDegraded,
      presenceLocation: oshe.presenceLatitude ? {
        latitude: oshe.presenceLatitude,
        longitude: oshe.presenceLongitude,
        accuracyM: oshe.presenceAccuracyM,
      } : null,
      file: {
        url: oshe.fileUrl,
        name: oshe.fileName,
        sizeBytes: oshe.fileSizeBytes,
        hashSha256: oshe.fileHashSha256,
      },
      serverReceivedAt: oshe.serverReceivedAt?.toISOString?.() ?? oshe.serverReceivedAt,
      timestampDiscrepancy: oshe.timestampDiscrepancy,
      notes: oshe.notes,
      witnessTaskId: oshe.witnessTaskId,
    };
  }
}
