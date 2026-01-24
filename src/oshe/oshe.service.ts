import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { NgOsheEvidence } from './ng-oshe-evidence.entity';
import { NgCircle } from '../circles/ng-circle.entity';
import { NgRole } from '../roles/ng-role.entity';
import { CirclesService } from '../circles/circles.service';
import { NgHttpError, NgErrorCodes } from '../common/errors/ng-http-error';

// ============================================================================
// Constants (§15 File Constraints)
// ============================================================================

const ALLOWED_MEDIA_TYPES = {
  video: ['mp4', 'mov', 'webm'],
  image: ['jpg', 'jpeg', 'png', 'heic', 'webp'],
  audio: ['m4a', 'aac', 'mp3', 'wav'],
};

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_FILES_PER_EVENT = 10;
const MAX_TOTAL_SIZE_PER_EVENT = 500 * 1024 * 1024; // 500 MB
const TIMESTAMP_DISCREPANCY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const RESOLVED_WINDOW_HOURS = 48; // §6.1

// ============================================================================
// DTOs
// ============================================================================

export interface CreateOsheDto {
  eventId: string;
  mediaType: 'video' | 'image' | 'audio';
  capturedAt: string;  // ISO 8601
  afterThreatState: 'TRIGGERED' | 'RESOLVED';
  
  // 文件信息
  fileUrl: string;
  fileName?: string;
  fileSizeBytes?: number;
  fileHashSha256?: string;
  
  // 现场验证
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  presenceVerificationDegraded?: boolean;
  
  // 可选
  notes?: string;
  witnessTaskId?: string;
}

export interface EventContext {
  eventId: string;
  threatState: 'TRIGGERED' | 'RESOLVED';
  stateChangedAt: Date;
}

// ============================================================================
// Service
// ============================================================================

/**
 * OSHE Service
 * 
 * 实现: ng_l2_on_scene_human_evidence_min_spec.md
 * 
 * 核心规则:
 * - OSHE 只能在 TRIGGERED 或 RESOLVED 状态下创建
 * - RESOLVED 后只有 48 小时窗口
 * - 必须进行 proximity 验证 (除非降级模式)
 * - Append-only, 不可修改或删除
 */
@Injectable()
export class OsheService {
  constructor(
    @InjectRepository(NgOsheEvidence)
    private readonly osheRepo: Repository<NgOsheEvidence>,
    @InjectRepository(NgCircle)
    private readonly circlesRepo: Repository<NgCircle>,
    @InjectRepository(NgRole)
    private readonly rolesRepo: Repository<NgRole>,
    private readonly circles: CirclesService,
  ) {}

  // ==========================================================================
  // 创建 OSHE (§2 Preconditions)
  // ==========================================================================

  /**
   * 创建 On-Scene Human Evidence
   * 
   * POST /api/circles/:circleId/events/:eventId/oshe
   */
  async createOshe(
    userId: string,
    circleId: string,
    dto: CreateOsheDto,
    eventContext: EventContext,
  ): Promise<NgOsheEvidence> {
    // Gate 1: 验证用户角色 (§3)
    const role = await this.circles.mustBeMember(userId, circleId);
    this.validateOsheRole(role.role);

    // Gate 2: 验证事件状态 (§2, §6.1)
    this.validateEventState(eventContext, dto.afterThreatState);

    // Gate 3: 验证时间窗口 (§6.1)
    this.validateTimeWindow(eventContext);

    // Gate 4: 验证现场 presence (§6.2)
    const circle = await this.circlesRepo.findOne({ where: { id: circleId } });
    const proximityResult = await this.validatePresence(
      dto.latitude,
      dto.longitude,
      dto.accuracy,
      circle?.latitude ?? null,
      circle?.longitude ?? null,
      circle?.proximityRadiusM ?? 50,
      dto.presenceVerificationDegraded,
    );

    // 验证文件约束 (§15)
    this.validateFileConstraints(dto, circleId, dto.eventId);

    // 检查时间戳差异 (§16)
    const serverReceivedAt = new Date();
    const capturedAt = new Date(dto.capturedAt);
    const timestampDiscrepancy = Math.abs(serverReceivedAt.getTime() - capturedAt.getTime()) > TIMESTAMP_DISCREPANCY_THRESHOLD_MS;

    // 创建 OSHE 记录
    const oshe = this.osheRepo.create({
      id: crypto.randomUUID(),
      circleId,
      eventId: dto.eventId,
      evidenceClass: 'ON_SCENE_HUMAN',
      mediaType: dto.mediaType,
      capturedAt,
      capturedByUserId: userId,
      capturedByRole: role.role,
      afterThreatState: dto.afterThreatState,
      source: 'human_on_scene',
      presenceVerified: proximityResult.verified,
      presenceLatitude: dto.latitude ?? null,
      presenceLongitude: dto.longitude ?? null,
      presenceAccuracyM: dto.accuracy ?? null,
      presenceVerificationDegraded: dto.presenceVerificationDegraded ?? false,
      fileUrl: dto.fileUrl,
      fileName: dto.fileName ?? null,
      fileSizeBytes: dto.fileSizeBytes ?? null,
      fileHashSha256: dto.fileHashSha256 ?? null,
      serverReceivedAt,
      timestampDiscrepancy,
      notes: dto.notes ?? null,
      witnessTaskId: dto.witnessTaskId ?? null,
      metadata: {
        proximityDistance: proximityResult.distance,
        proximityRequired: circle?.proximityRadiusM ?? 50,
      },
    });

    await this.osheRepo.save(oshe);
    return oshe;
  }

  // ==========================================================================
  // 从 Witness Task 创建 OSHE (§13 Option A: Integrated)
  // ==========================================================================

  /**
   * 从 Witness Task 提交创建 OSHE
   * 
   * 当 Witness 提交报告时，自动将 photos 转换为 OSHE
   */
  async createFromWitnessTask(
    userId: string,
    circleId: string,
    witnessTaskId: string,
    photos: Array<{ url: string; fileName?: string; fileSizeBytes?: number }>,
    eventContext: EventContext | null,
    location: { latitude: number; longitude: number; accuracy?: number },
  ): Promise<NgOsheEvidence[]> {
    if (!photos || photos.length === 0) {
      return [];
    }

    // 如果没有关联事件，跳过 OSHE 创建
    if (!eventContext) {
      return [];
    }

    const results: NgOsheEvidence[] = [];

    for (const photo of photos) {
      try {
        const oshe = await this.createOshe(userId, circleId, {
          eventId: eventContext.eventId,
          mediaType: 'image',
          capturedAt: new Date().toISOString(),
          afterThreatState: eventContext.threatState,
          fileUrl: photo.url,
          fileName: photo.fileName,
          fileSizeBytes: photo.fileSizeBytes,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          witnessTaskId,
        }, eventContext);
        results.push(oshe);
      } catch (e) {
        // 记录错误但继续处理其他照片
        console.error(`Failed to create OSHE from witness task photo: ${e}`);
      }
    }

    return results;
  }

  // ==========================================================================
  // 查询
  // ==========================================================================

  /**
   * 列出事件的 OSHE
   * 
   * GET /api/circles/:circleId/events/:eventId/oshe
   */
  async listByEvent(
    userId: string,
    circleId: string,
    eventId: string,
  ): Promise<NgOsheEvidence[]> {
    await this.circles.mustBeMember(userId, circleId);

    return this.osheRepo.find({
      where: { circleId, eventId },
      order: { capturedAt: 'ASC' },
    });
  }

  /**
   * 获取 OSHE 详情
   * 
   * GET /api/circles/:circleId/events/:eventId/oshe/:osheId
   */
  async getOshe(
    userId: string,
    circleId: string,
    eventId: string,
    osheId: string,
  ): Promise<NgOsheEvidence> {
    await this.circles.mustBeMember(userId, circleId);

    const oshe = await this.osheRepo.findOne({
      where: { id: osheId, circleId, eventId },
    });

    if (!oshe) {
      throw this.makeError(404, NgErrorCodes.NOT_FOUND, 'OSHE evidence not found');
    }

    return oshe;
  }

  /**
   * 获取 IncidentPacketManifest 格式的 OSHE 列表 (§8)
   */
  async getManifestItems(
    circleId: string,
    eventId: string,
  ): Promise<Array<{
    itemId: string;
    type: string;
    source: string;
    auditWeight: string;
    capturedAt: string;
    capturedByRole: string;
    afterThreatState: string;
  }>> {
    const items = await this.osheRepo.find({
      where: { circleId, eventId },
      order: { capturedAt: 'ASC' },
    });

    return items.map(item => ({
      itemId: item.id,
      type: item.mediaType === 'video' ? 'clip' : item.mediaType === 'audio' ? 'audio' : 'snapshot',
      source: 'human_on_scene',
      auditWeight: 'supplemental',
      capturedAt: item.capturedAt.toISOString(),
      capturedByRole: item.capturedByRole,
      afterThreatState: item.afterThreatState,
    }));
  }

  // ==========================================================================
  // Validation Helpers
  // ==========================================================================

  /**
   * 验证角色是否有 OSHE 权限 (§3)
   */
  private validateOsheRole(role: string): void {
    const allowedRoles = ['owner', 'caretaker', 'acting_owner', 'witness'];
    if (!allowedRoles.includes(role)) {
      throw this.makeError(403, NgErrorCodes.FORBIDDEN, `Role '${role}' is not authorized to create OSHE`);
    }
  }

  /**
   * 验证事件状态 (§2)
   */
  private validateEventState(context: EventContext, declaredState: string): void {
    const allowedStates = ['TRIGGERED', 'RESOLVED'];
    
    if (!allowedStates.includes(context.threatState)) {
      throw this.makeError(400, 'INVALID_EVENT_STATE', 
        `OSHE can only be created for events in TRIGGERED or RESOLVED state. Current: ${context.threatState}`);
    }

    if (context.threatState !== declaredState) {
      throw this.makeError(400, 'STATE_MISMATCH',
        `Declared afterThreatState (${declaredState}) does not match event state (${context.threatState})`);
    }
  }

  /**
   * 验证时间窗口 (§6.1)
   */
  private validateTimeWindow(context: EventContext): void {
    if (context.threatState === 'TRIGGERED') {
      return; // TRIGGERED 状态无时间限制
    }

    // RESOLVED 状态: 检查 48 小时窗口
    const now = new Date();
    const windowEnd = new Date(context.stateChangedAt.getTime() + RESOLVED_WINDOW_HOURS * 60 * 60 * 1000);
    
    if (now > windowEnd) {
      throw this.makeError(400, 'OSHE_WINDOW_EXPIRED',
        `OSHE creation window expired. Event was RESOLVED at ${context.stateChangedAt.toISOString()}, ` +
        `window closed at ${windowEnd.toISOString()}`);
    }
  }

  /**
   * 验证现场 presence (§6.2)
   */
  private async validatePresence(
    witnessLat: number | undefined,
    witnessLng: number | undefined,
    accuracy: number | undefined,
    homeLat: number | null,
    homeLng: number | null,
    radiusM: number,
    degradedMode?: boolean,
  ): Promise<{ verified: boolean; distance?: number }> {
    // 降级模式: 允许但标记
    if (degradedMode) {
      return { verified: false };
    }

    // 如果没有位置信息，拒绝
    if (witnessLat === undefined || witnessLng === undefined) {
      throw this.makeError(400, 'PRESENCE_REQUIRED',
        'GPS location is required for OSHE creation. Use presenceVerificationDegraded=true if GPS unavailable.');
    }

    // 检查 GPS 精度
    if (accuracy && accuracy > 100) {
      throw this.makeError(400, 'ACCURACY_INSUFFICIENT',
        `GPS accuracy insufficient (${accuracy}m). Required: <100m`);
    }

    // 如果 Home 没有设置坐标，跳过验证
    if (homeLat === null || homeLng === null) {
      return { verified: true };
    }

    // 计算距离
    const distance = this.calculateDistance(witnessLat, witnessLng, homeLat, homeLng);

    if (distance > radiusM) {
      throw this.makeError(400, 'PROXIMITY_FAILED',
        `Too far from location (${Math.round(distance)}m, required: ${radiusM}m)`, {
          distance,
          required: radiusM,
        });
    }

    return { verified: true, distance };
  }

  /**
   * 验证文件约束 (§15)
   */
  private async validateFileConstraints(
    dto: CreateOsheDto,
    circleId: string,
    eventId: string,
  ): Promise<void> {
    // 检查 mediaType 有效性
    if (!['video', 'image', 'audio'].includes(dto.mediaType)) {
      throw this.makeError(400, 'INVALID_MEDIA_TYPE',
        `Invalid media type '${dto.mediaType}'. Allowed: video, image, audio`);
    }

    // 检查文件大小
    if (dto.fileSizeBytes && dto.fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      throw this.makeError(400, 'FILE_TOO_LARGE',
        `File size ${dto.fileSizeBytes} exceeds maximum ${MAX_FILE_SIZE_BYTES} bytes`);
    }

    // 检查文件类型 (从 URL 或 fileName 推断)
    const fileName = dto.fileName ?? dto.fileUrl;
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (extension) {
      const allowedExtensions = ALLOWED_MEDIA_TYPES[dto.mediaType] ?? [];
      if (allowedExtensions.length > 0 && !allowedExtensions.includes(extension)) {
        throw this.makeError(400, 'INVALID_FILE_TYPE',
          `File extension '${extension}' not allowed for media type '${dto.mediaType}'. ` +
          `Allowed: ${allowedExtensions.join(', ')}`);
      }
    }

    // 检查每事件文件数量限制
    const existingCount = await this.osheRepo.count({
      where: { circleId, eventId },
    });

    if (existingCount >= MAX_FILES_PER_EVENT) {
      throw this.makeError(400, 'MAX_FILES_EXCEEDED',
        `Maximum ${MAX_FILES_PER_EVENT} OSHE files per event reached`);
    }
  }

  /**
   * Haversine 公式计算两点距离 (米)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private makeError(statusCode: number, code: string, message: string, details?: any): NgHttpError {
    return new NgHttpError({
      statusCode,
      error: statusCode === 400 ? 'Bad Request' : statusCode === 403 ? 'Forbidden' : 'Not Found',
      code,
      message,
      timestamp: new Date().toISOString(),
      retryable: false,
      details,
    });
  }
}
