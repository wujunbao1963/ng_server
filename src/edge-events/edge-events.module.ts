import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractsValidatorService } from '../common/contracts/contracts-validator.service';
import { DeviceAuthModule } from '../device-auth/device-auth.module';
import { CirclesModule } from '../circles/circles.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TopoMapModule } from '../topomap/topomap.module';
import { NgEdgeEvent } from './ng-edge-event.entity';
import { NgEdgeIngestAudit } from './ng-edge-ingest-audit.entity';
import { NgEdgeEventSummaryRaw } from './ng-edge-event-summary-raw.entity';
import { NgIncidentManifest } from './ng-incident-manifest.entity';
import { NgIncidentManifestRaw } from './ng-incident-manifest-raw.entity';
import { NgEdgeCommand } from './ng-edge-command.entity';
import { EdgeEventsController } from './edge-events.controller';
import { EdgeCommandsController } from './edge-commands.controller';
import { EdgeEventsService } from './edge-events.service';
import { EdgeCommandsService } from './edge-commands.service';
import { IncidentManifestsService } from './incident-manifests.service';
import { EventViewModelService } from './event-viewmodel.service';
import { IngestEdgeEventUseCase } from '../application/usecases';

@Module({
  imports: [
    DeviceAuthModule,
    CirclesModule,
    NotificationsModule,
    TopoMapModule,
    TypeOrmModule.forFeature([
      NgEdgeEventSummaryRaw,
      NgEdgeEvent,
      NgEdgeIngestAudit,
      NgIncidentManifestRaw,
      NgIncidentManifest,
      NgEdgeCommand,
    ]),
  ],
  controllers: [EdgeEventsController, EdgeCommandsController],
  providers: [
    EdgeEventsService,
    EdgeCommandsService,
    IncidentManifestsService,
    EventViewModelService,
    ContractsValidatorService,
    IngestEdgeEventUseCase,
  ],
  exports: [EdgeCommandsService, EventViewModelService],
})
export class EdgeEventsModule {}
