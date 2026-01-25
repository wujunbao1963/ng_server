import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NgWitnessAlert } from './ng-witness-alert.entity';
import { WitnessAlertsService } from './witness-alerts.service';
import { WitnessAlertsController } from './witness-alerts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([NgWitnessAlert]),
  ],
  controllers: [WitnessAlertsController],
  providers: [WitnessAlertsService],
  exports: [WitnessAlertsService], // 导出供 WitnessTasksModule 使用
})
export class WitnessAlertsModule {}
