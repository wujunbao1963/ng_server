import { Injectable, Logger } from '@nestjs/common';
import { NgEdgeDevice } from '../../edge-devices/ng-edge-device.entity';
import { EvidenceService } from '../../evidence/evidence.service';

/**
 * UseCase: 完成 Evidence 上传会话
 * 
 * 职责：
 * 1. 接收已验证的完成请求
 * 2. 调用 Service 执行业务逻辑（在事务内）
 * 3. 返回标准化结果
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
  manifest: { items: any[] };
  reportPackage?: { included: boolean; type?: string; sha256?: string };
  /** 用于日志追踪的请求 ID */
  requestId?: string;
}

export interface CompleteEvidenceOutput {
  evidenceId: string;
  status: string;
  completedAt: string;
  manifest: any;
  reportPackage: any;
  warnings?: string[];
  deduplicated?: boolean;
}

@Injectable()
export class CompleteEvidenceUseCase {
  private readonly logger = new Logger(CompleteEvidenceUseCase.name);

  constructor(
    private readonly evidenceService: EvidenceService,
  ) {}

  async execute(input: CompleteEvidenceInput): Promise<CompleteEvidenceOutput> {
    const { device, circleId, eventId, sessionId, manifest, reportPackage, requestId } = input;
    const startTime = Date.now();

    this.logger.log(
      `Completing evidence: sessionId=${sessionId}, eventId=${eventId}, circleId=${circleId}` +
      (requestId ? `, requestId=${requestId}` : '')
    );

    const result = await this.evidenceService.completeEvidence(
      device,
      circleId,
      eventId,
      { sessionId, manifest, reportPackage },
    );

    const duration = Date.now() - startTime;
    this.logger.log(
      `Evidence completed: evidenceId=${result.evidenceId}, deduplicated=${result.deduplicated ?? false}, duration=${duration}ms`
    );

    return result;
  }
}
