import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DeviceKeyAuthGuard } from '../device-auth/device-key-auth.guard';
import { NgDevice } from '../device-auth/ng-device.decorator';
import { NgEdgeDevice } from '../edge-devices/ng-edge-device.entity';
import { CirclesService } from '../circles/circles.service';
import { JwtUser } from '../auth/auth.types';
import {
  LedgerIngestService,
  LedgerBatchDto,
  LedgerIngestResponse,
} from './ledger-ingest.service';

/**
 * Ledger Ingest Controller
 * 
 * Endpoints:
 * - POST /api/circles/:circleId/edge/ledger/batch - Upload ledger batch (Edge auth)
 * - GET /api/circles/:circleId/edge/ledger/ack - Get ack sequence (Edge auth)
 * - GET /api/circles/:circleId/ledger - Query ledger entries (User auth)
 */
@Controller()
export class LedgerIngestController {
  constructor(
    private readonly svc: LedgerIngestService,
    private readonly circles: CirclesService,
  ) {}

  // ===========================================================================
  // Edge Device Endpoints (Device Key Auth)
  // ===========================================================================

  /**
   * Upload a batch of ledger entries from Edge device.
   * 
   * POST /api/circles/:circleId/edge/ledger/batch
   */
  @Post('/api/circles/:circleId/edge/ledger/batch')
  @UseGuards(DeviceKeyAuthGuard)
  async uploadBatch(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @NgDevice() device: NgEdgeDevice,
    @Body() body: LedgerBatchDto,
  ): Promise<LedgerIngestResponse> {
    // Verify device belongs to circle
    if (device.circleId !== circleId) {
      return {
        ok: false,
        ackedSeq: 0,
        insertedCount: 0,
        skippedCount: 0,
        error: 'Device not authorized for this circle',
        retryable: false,
      };
    }

    return this.svc.ingestBatch(circleId, body);
  }

  /**
   * Get current ack sequence for the device.
   * 
   * GET /api/circles/:circleId/edge/ledger/ack?edgeInstanceId=xxx
   */
  @Get('/api/circles/:circleId/edge/ledger/ack')
  @UseGuards(DeviceKeyAuthGuard)
  async getAckSeq(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @NgDevice() device: NgEdgeDevice,
    @Query('edgeInstanceId') edgeInstanceId: string,
  ) {
    if (device.circleId !== circleId) {
      return { ok: false, error: 'Device not authorized for this circle' };
    }

    const ackSeq = await this.svc.getAckSeq(circleId, edgeInstanceId);
    
    return {
      ok: true,
      edgeInstanceId,
      ackedSeq: ackSeq,
    };
  }

  /**
   * Acknowledge receipt of server data (for bidirectional sync).
   * 
   * POST /api/circles/:circleId/edge/ledger/ack
   */
  @Post('/api/circles/:circleId/edge/ledger/ack')
  @UseGuards(DeviceKeyAuthGuard)
  async postAck(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @NgDevice() device: NgEdgeDevice,
    @Body() body: { ackedSeq: number },
  ) {
    // For future: track what Edge has received from Server
    return {
      ok: true,
      ackedSeq: body.ackedSeq,
    };
  }

  // ===========================================================================
  // App/User Endpoints (JWT Auth)
  // ===========================================================================

  /**
   * Query ledger entries for a circle.
   * 
   * GET /api/circles/:circleId/ledger
   * 
   * Security: Requires user to be a member of the circle.
   */
  @Get('/api/circles/:circleId/ledger')
  @UseGuards(AuthGuard('jwt'))
  async queryLedger(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Query('eventId') eventId?: string,
    @Query('entryType') entryType?: string,
    @Query('edgeInstanceId') edgeInstanceId?: string,
    @Query('limit') limitStr?: string,
  ) {
    // Security check: user must be a member of the circle
    await this.circles.mustBeMember(req.user.userId, circleId);
    
    const limit = Math.min(parseInt(limitStr ?? '50', 10) || 50, 200);

    if (eventId) {
      const entries = await this.svc.getEntriesForEvent(circleId, eventId, limit);
      return { entries, count: entries.length };
    }

    if (entryType) {
      const entries = await this.svc.getEntriesByType(circleId, entryType, limit);
      return { entries, count: entries.length };
    }

    if (edgeInstanceId) {
      const entries = await this.svc.getRecentEntries(circleId, edgeInstanceId, limit);
      return { entries, count: entries.length };
    }

    // Default: return recent entries
    const entries = await this.svc.getRecentEntries(circleId, '', limit);
    return { entries, count: entries.length };
  }
}
