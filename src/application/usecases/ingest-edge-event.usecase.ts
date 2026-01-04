import { Injectable, Logger } from '@nestjs/common';
import { EdgeEventsService, EdgeEventSummaryUpsertV77, EdgeSummaryUpsertResult } from '../../edge-events/edge-events.service';

/**
 * UseCase: 处理 Edge 设备上报的事件摘要
 * 
 * 职责：
 * 1. 接收已验证的事件摘要数据
 * 2. 调用 Service 执行存储逻辑
 * 3. 返回标准化结果
 * 
 * 不负责：
 * - HTTP 层面的参数验证（Controller 职责）
 * - 数据库事务细节（Service 职责）
 */
export interface IngestEdgeEventInput {
  payload: EdgeEventSummaryUpsertV77;
  /** 用于日志追踪的请求 ID */
  requestId?: string;
}

export interface IngestEdgeEventOutput {
  ok: boolean;
  applied: boolean;
  reason: EdgeSummaryUpsertResult['reason'];
  serverReceivedAt: string;
}

@Injectable()
export class IngestEdgeEventUseCase {
  private readonly logger = new Logger(IngestEdgeEventUseCase.name);

  constructor(
    private readonly edgeEventsService: EdgeEventsService,
  ) {}

  async execute(input: IngestEdgeEventInput): Promise<IngestEdgeEventOutput> {
    const { payload, requestId } = input;
    const startTime = Date.now();

    this.logger.log(
      `Processing event: eventId=${payload.eventId}, circleId=${payload.circleId}, threatState=${payload.threatState}` +
      (requestId ? `, requestId=${requestId}` : '')
    );

    const result = await this.edgeEventsService.storeSummaryUpsert(payload);

    const duration = Date.now() - startTime;
    this.logger.log(
      `Event processed: eventId=${payload.eventId}, applied=${result.applied}, reason=${result.reason}, duration=${duration}ms`
    );

    return {
      ok: true,
      applied: result.applied,
      reason: result.reason,
      serverReceivedAt: new Date().toISOString(),
    };
  }
}
