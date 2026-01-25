import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { AdminMaintenanceController } from './admin-maintenance.controller';
import { NgUser } from '../auth/ng-user.entity';
import { NgCircle } from '../circles/ng-circle.entity';
import { NgRole } from '../roles/ng-role.entity';
import { NgOutbox } from '../common/outbox/ng-outbox.entity';
import { NgNotification } from '../notifications/ng-notification.entity';
import { NgPushDevice } from '../notifications/ng-push-device.entity';
import { EvidenceTicketsModule } from '../evidence-tickets/evidence-tickets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NgUser, 
      NgCircle, 
      NgRole,
      NgOutbox,
      NgNotification,
      NgPushDevice,
    ]),
    EvidenceTicketsModule,
  ],
  controllers: [AdminController, AdminMaintenanceController],
  providers: [AdminService, AdminGuard],
  exports: [AdminService, AdminGuard],
})
export class AdminModule {}
