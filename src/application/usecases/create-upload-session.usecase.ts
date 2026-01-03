import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { NgLoggerService } from '../../common/infra/logger.service';
import { CLOCK_PORT, ClockPort } from '../../common/infra/clock.port';
import { NgHttpError, NgErrorCodes } from '../../common/errors/ng-http-error';
import { NgEvent } from '../../events-ingest/ng-event.entity';
import { NgEvidenceSession } from '../../evidence/ng-evidence-session.entity';
import { NgEvidenceItem } from '../../evidence/ng-evidence-item.entity';

/**
 * Evidence Manifest Item
 */
export interface EvidenceManifestItem {
  sha256: string;
  type: string;
  contentType: string;
  size: number;
  timeRange?: {
    startAt: string;
    endAt: string;
  };
  deviceRef?: {
    kind: string;
    id: string;
    displayName?: string;
  };
}

/**
 * 上传 Session 创建请求
 */
export interface CreateUploadSessionRequest {
  manifest?: {
    items?: EvidenceManifestItem[];
  };
}

/**
 * 上传 Session 创建结果
 */
export interface CreateUploadSessionResult {
  sessionId: string;
  items: Array<{
    sha256: string;
    objectKey: string;
  }>;
}

/**
 * 预签名 URL 请求
 */
export interface PresignRequest {
  circleId: string;
  eventId: string;
  sha256: string;
  contentType: string;
}

/**
 * 存储服务接口（由外部注入）
 */
export interface EvidenceStoragePort {
  presignUploadUrl(req: PresignRequest): Promise<{ url: string; objectKey: string; expiresAt: string }>;
}

function stableStringify(value: any): string {
  if (value === null || value === undefined) return String(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * CreateUploadSessionUseCase - 创建上传 Session 用例
 *
 * 职责：
 * 1. 验证事件存在
 * 2. 在事务中创建 session 和 items
 * 3. 返回需要生成预签名 URL 的 items
 *
 * 注意：预签名 URL 生成在 UseCase 外部完成，避免长事务
 */
@Injectable()
export class CreateUploadSessionUseCase {
  private readonly logger: NgLoggerService;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(NgEvent)
    private readonly eventsRepo: Repository<NgEvent>,
    @InjectRepository(NgEvidenceSession)
    private readonly sessionsRepo: Repository<NgEvidenceSession>,
    @InjectRepository(NgEvidenceItem)
    private readonly itemsRepo: Repository<NgEvidenceItem>,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    logger: NgLoggerService,
  ) {
    this.logger = logger.setContext('CreateUploadSessionUseCase');
  }

  /**
   * 执行创建上传 Session
   *
   * @returns result - Session 信息
   * @returns presignRequests - 需要生成预签名 URL 的请求列表
   */
  async execute(
    circleId: string,
    eventId: string,
    deviceId: string,
    request: CreateUploadSessionRequest,
  ): Promise<{
    result: CreateUploadSessionResult;
    presignRequests: PresignRequest[];
  }> {
    const logCtx = { circleId, eventId, deviceId };

    // 1) 验证事件存在
    await this.mustEventExist(circleId, eventId);

    const sessionId = crypto.randomUUID();
    const now = this.clock.now();
    const manifest = request?.manifest ?? null;
    const manifestHash = sha256Hex(stableStringify(manifest ?? {}));

    this.logger.log('Creating evidence upload session', logCtx);

    // 2) 在事务中创建 session 和 items
    const items: Array<{ sha256: string; objectKey: string; contentType: string }> = [];

    await this.dataSource.transaction(async (manager) => {
      const sessionRepo = manager.getRepository(NgEvidenceSession);
      const itemRepo = manager.getRepository(NgEvidenceItem);

      // 创建 session
      const session = sessionRepo.create({
        id: sessionId,
        circleId,
        eventId,
        edgeDeviceId: deviceId,
        status: 'OPEN',
        evidenceId: null,
        manifestHash,
        createdAt: now,
        completedAt: null,
      });
      await sessionRepo.save(session);

      // 创建 items
      const manifestItems = (manifest?.items ?? []) as EvidenceManifestItem[];
      for (const it of manifestItems) {
        const startAt = it.timeRange?.startAt ? new Date(it.timeRange.startAt) : now;
        const endAt = it.timeRange?.endAt ? new Date(it.timeRange.endAt) : now;

        const deviceKind = String(it.deviceRef?.kind ?? 'other');
        const deviceRefId = String(it.deviceRef?.id ?? 'unknown');
        const deviceDisplayName = it.deviceRef?.displayName
          ? String(it.deviceRef.displayName)
          : null;

        const objectKey = `circles/${circleId}/events/${eventId}/${it.sha256}`;

        const row = itemRepo.create({
          id: crypto.randomUUID(),
          sessionId,
          circleId,
          eventId,
          sha256: it.sha256,
          type: it.type,
          contentType: it.contentType,
          size: String(it.size),
          timeRangeStartAt: startAt,
          timeRangeEndAt: endAt,
          deviceRefKind: deviceKind,
          deviceRefId: deviceRefId,
          deviceRefDisplayName: deviceDisplayName,
          objectKey,
          timeRange: it.timeRange,
          deviceRef: it.deviceRef,
          createdAt: now,
        });
        await itemRepo.save(row);

        items.push({
          sha256: it.sha256,
          objectKey,
          contentType: it.contentType,
        });
      }
    });

    this.logger.log('Evidence upload session created', {
      ...logCtx,
      sessionId,
      itemCount: items.length,
    });

    // 3) 构建预签名请求列表
    const presignRequests: PresignRequest[] = items.map((it) => ({
      circleId,
      eventId,
      sha256: it.sha256,
      contentType: it.contentType,
    }));

    return {
      result: {
        sessionId,
        items: items.map((it) => ({
          sha256: it.sha256,
          objectKey: it.objectKey,
        })),
      },
      presignRequests,
    };
  }

  /**
   * 验证事件存在
   */
  private async mustEventExist(circleId: string, eventId: string): Promise<void> {
    const ev = await this.eventsRepo.findOne({ where: { circleId, eventId } });
    if (!ev) {
      throw new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: NgErrorCodes.NOT_FOUND,
        message: 'Event not found',
        timestamp: this.clock.isoNow(),
        retryable: false,
      });
    }
  }
}
