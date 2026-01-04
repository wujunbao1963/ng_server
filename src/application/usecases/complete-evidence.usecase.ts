import { Injectable, Logger, Inject } from '@nestjs/common';
import { EvidenceService } from '../../evidence/evidence.service';
import { NgEdgeDevice } from '../../edge-devices/ng-edge-device.entity';
import { ClockPort, CLOCK_PORT } from '../../infra/ports';

/**
 * UseCase: 完成证据上传
 * 
 * 职责：
 * 1. 接收已验证的证据完成请求
 * 2. 记录操作日志和耗时
 * 3. 调用 Service 执行业务逻辑
 * 4. 返回标准化结果
 * 
 * 不负责：
 * - HTTP 层面的参数验证（Controller 职责）
 * - 数据库事务细节（Service 职责）
 */
export interface CompleteEvidenceInput {
  device: NgEdgeDevice;
  circleId: string;
  eventId: string;
  sessionId: string;
  manifest: {
    items: Array<{
      sha256: string;
      contentType: string;
      sizeBytes: number;
      capturedAt: string;
      mediaType: string;
      cameraId?: string;
    }>;
  };
  reportPackage?: {
    included: boolean;
    type?: string;
    sha256?: string;
  };
  /** 用于日志追踪的请求 ID */
  requestId?: string;
}

export interface CompleteEvidenceOutput {
  evidenceId: string;
  evidenceStatus: string;
  completedAt: string;
  deduplicated: boolean;
  manifest: {
    itemCount: number;
    items: Array<{
      sha256: string;
      contentType: string;
      status: string;
    }>;
  };
  reportPackage: {
    included: boolean;
    status: string;
  };
  warnings: string[];
}

@Injectable()
export class CompleteEvidenceUseCase {
  private readonly logger = new Logger(CompleteEvidenceUseCase.name);

  constructor(
    private readonly evidenceService: EvidenceService,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  async execute(input: CompleteEvidenceInput): Promise<CompleteEvidenceOutput> {
    const { device, circleId, eventId, sessionId, requestId } = input;
    const startTime = this.clock.timestamp();

    this.logger.log(
      `Processing evidence completion: eventId=${eventId}, sessionId=${sessionId}, ` +
      `deviceId=${device.id}, itemCount=${input.manifest.items.length}` +
      (requestId ? `, requestId=${requestId}` : '')
    );

    const result = await this.evidenceService.completeEvidence(device, circleId, eventId, {
      sessionId: input.sessionId,
      manifest: input.manifest,
      reportPackage: input.reportPackage,
    });

    const duration = this.clock.timestamp() - startTime;
    this.logger.log(
      `Evidence completed: evidenceId=${result.evidenceId}, ` +
      `status=${result.evidenceStatus}, deduplicated=${result.deduplicated}, ` +
      `duration=${duration}ms`
    );

    return result;
  }
}
