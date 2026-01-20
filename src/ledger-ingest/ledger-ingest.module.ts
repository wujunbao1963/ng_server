import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NgLedgerEntry } from './ng-ledger-entry.entity';
import { LedgerIngestService } from './ledger-ingest.service';
import { LedgerIngestController } from './ledger-ingest.controller';
import { CirclesModule } from '../circles/circles.module';
import { DeviceAuthModule } from '../device-auth/device-auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NgLedgerEntry]),
    CirclesModule,
    DeviceAuthModule,
  ],
  controllers: [LedgerIngestController],
  providers: [LedgerIngestService],
  exports: [LedgerIngestService],
})
export class LedgerIngestModule {}
