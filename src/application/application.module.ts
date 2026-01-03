import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IngestEdgeEventUseCase } from './usecases/ingest-edge-event.usecase';
import { CompleteEvidenceUseCase } from './usecases/complete-evidence.usecase';
import { CreateUploadSessionUseCase } from './usecases/create-upload-session.usecase';
import { NgEdgeEvent } from '../edge-events/ng-edge-event.entity';
import { NgEdgeEventSummaryRaw } from '../edge-events/ng-edge-event-summary-raw.entity';
import { NgEdgeIngestAudit } from '../edge-events/ng-edge-ingest-audit.entity';
import { NgEvent } from '../events-ingest/ng-event.entity';
import { NgEvidenceSession } from '../evidence/ng-evidence-session.entity';
import { NgEvidenceItem } from '../evidence/ng-evidence-item.entity';
import { NgEventEvidence } from '../evidence/ng-event-evidence.entity';

/**
 * ApplicationModule - 应用层模块
 *
 * 提供所有 UseCase，作为业务逻辑的统一入口
 *
 * UseCase 职责：
 * - 编排业务流程
 * - 协调多个领域服务
 * - 管理事务边界
 * - 返回副作用请求（不直接执行）
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Edge Events
      NgEdgeEvent,
      NgEdgeEventSummaryRaw,
      NgEdgeIngestAudit,
      // Evidence
      NgEvent,
      NgEvidenceSession,
      NgEvidenceItem,
      NgEventEvidence,
    ]),
  ],
  providers: [
    IngestEdgeEventUseCase,
    CompleteEvidenceUseCase,
    CreateUploadSessionUseCase,
  ],
  exports: [
    IngestEdgeEventUseCase,
    CompleteEvidenceUseCase,
    CreateUploadSessionUseCase,
  ],
})
export class ApplicationModule {}
