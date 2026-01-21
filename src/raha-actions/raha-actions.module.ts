import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RahaActionsController } from './raha-actions.controller';
import { RahaActionsService } from './raha-actions.service';
import { NgEdgeDevice } from '../edge-devices/ng-edge-device.entity';
import { CirclesModule } from '../circles/circles.module';

/**
 * RAHA Actions Module
 * 
 * Phase 6: Server RAHA Forwarding
 * 
 * Provides:
 * - POST /api/circles/:circleId/actions - Execute RAHA
 * - GET/PUT /api/circles/:circleId/devices/:deviceId/edge-url - Manage Edge URL
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([NgEdgeDevice]),
    CirclesModule,
  ],
  controllers: [RahaActionsController],
  providers: [RahaActionsService],
  exports: [RahaActionsService],
})
export class RahaActionsModule {}
