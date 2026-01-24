import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NgUser } from '../auth/ng-user.entity';
import { NgRole } from '../roles/ng-role.entity';
import { CirclesController } from './circles.controller';
import { CirclesService } from './circles.service';
import { NgCircle } from './ng-circle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NgUser, NgCircle, NgRole])],
  controllers: [CirclesController],
  providers: [CirclesService],
  exports: [CirclesService],
})
export class CirclesModule {}
