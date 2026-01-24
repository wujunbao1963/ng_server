import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NgOsheEvidence } from './ng-oshe-evidence.entity';
import { NgCircle } from '../circles/ng-circle.entity';
import { NgRole } from '../roles/ng-role.entity';
import { OsheService } from './oshe.service';
import { OsheController } from './oshe.controller';
import { CirclesModule } from '../circles/circles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NgOsheEvidence, NgCircle, NgRole]),
    CirclesModule,
  ],
  controllers: [OsheController],
  providers: [OsheService],
  exports: [OsheService],
})
export class OsheModule {}
