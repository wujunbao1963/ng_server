import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { NgUser } from '../auth/ng-user.entity';
import { NgCircle } from '../circles/ng-circle.entity';
import { NgRole } from '../roles/ng-role.entity';
import { EvidenceTicketsModule } from '../evidence-tickets/evidence-tickets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NgUser, NgCircle, NgRole]),
    EvidenceTicketsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
  exports: [AdminService, AdminGuard],
})
export class AdminModule {}
