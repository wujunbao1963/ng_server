import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NgWitnessTask } from './ng-witness-task.entity';
import { NgCircle } from '../circles/ng-circle.entity';
import { NgRole } from '../roles/ng-role.entity';
import { NgUser } from '../auth/ng-user.entity';
import { WitnessTasksService } from './witness-tasks.service';
import { WitnessTasksController } from './witness-tasks.controller';
import { CirclesModule } from '../circles/circles.module';
import { WitnessAlertsModule } from '../witness-alerts/witness-alerts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NgWitnessTask, NgCircle, NgRole, NgUser]),
    CirclesModule,
    WitnessAlertsModule, // Witness 专用消息通知
  ],
  controllers: [WitnessTasksController],
  providers: [WitnessTasksService],
  exports: [WitnessTasksService],
})
export class WitnessTasksModule {}
