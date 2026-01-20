import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NgRole, NgRoleAudit } from './ng-role.entity';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { CirclesModule } from '../circles/circles.module';
import { DeviceAuthModule } from '../device-auth/device-auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NgRole, NgRoleAudit]),
    CirclesModule,
    DeviceAuthModule,
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
