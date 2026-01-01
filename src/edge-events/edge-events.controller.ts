import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ContractsValidatorService } from '../common/contracts/contracts-validator.service';
import { makeValidationError, NgHttpError } from '../common/errors/ng-http-error';
import { DeviceKeyAuthGuard } from '../device-auth/device-key-auth.guard';
import { EdgeEventsService, EdgeEventSummaryUpsertV77 } from './edge-events.service';
import { IncidentManifestsService, EdgeIncidentManifestUpsertV77 } from './incident-manifests.service';
import { CirclesService } from '../circles/circles.service';
import { JwtUser } from '../auth/auth.types';

@Controller('/api/circles/:circleId/edge/events')
export class EdgeEventsController {
  constructor(
    private readonly contracts: ContractsValidatorService,
    private readonly svc: EdgeEventsService,
    private readonly manifests: IncidentManifestsService,
    private readonly circles: CirclesService,
  ) {}

  /**
   * List edge events for App (user auth)
   * GET /api/circles/:circleId/edge/events
   */
  @Get()
  @UseGuards(AuthGuard('jwt'))
  async listEvents(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Query('limit') limitStr?: string,
  ) {
    await this.circles.mustBeMember(req.user.userId, circleId);
    const limit = limitStr ? Math.min(parseInt(limitStr, 10) || 50, 100) : 50;
    return this.svc.listEvents(circleId, limit);
  }

  /**
   * Get single edge event for App (user auth)
   * GET /api/circles/:circleId/edge/events/:eventId
   */
  @Get(':eventId')
  @UseGuards(AuthGuard('jwt'))
  async getEvent(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('eventId') eventId: string,
  ) {
    await this.circles.mustBeMember(req.user.userId, circleId);
    const event = await this.svc.getEvent(circleId, eventId);
    if (!event) {
      throw new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: 'NOT_FOUND',
        message: 'Event not found',
        timestamp: new Date().toISOString(),
        details: { circleId, eventId },
        retryable: false,
      });
    }
    return event;
  }

  /**
   * Update edge event status (user auth)
   * PATCH /api/circles/:circleId/edge/events/:eventId/status
   */
  @Patch(':eventId/status')
  @UseGuards(AuthGuard('jwt'))
  async updateStatus(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('eventId') eventId: string,
    @Body() body: { status: 'OPEN' | 'ACKED' | 'RESOLVED'; note?: string },
  ) {
    await this.circles.mustBeMember(req.user.userId, circleId);
    
    if (!['OPEN', 'ACKED', 'RESOLVED'].includes(body.status)) {
      throw new NgHttpError({
        statusCode: 400,
        error: 'Bad Request',
        code: 'INVALID_STATUS',
        message: 'Status must be OPEN, ACKED, or RESOLVED',
        timestamp: new Date().toISOString(),
        details: { status: body.status },
        retryable: false,
      });
    }
    
    const result = await this.svc.updateEventStatus(circleId, eventId, body.status, body.note);
    if (!result) {
      throw new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: 'NOT_FOUND',
        message: 'Event not found',
        timestamp: new Date().toISOString(),
        details: { circleId, eventId },
        retryable: false,
      });
    }
    return result;
  }

  @Post('summary-upsert')
  @UseGuards(DeviceKeyAuthGuard)
  async summaryUpsert(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Body() body: unknown,
  ) {
    const validation = this.contracts.validateEdgeEventSummaryUpsertRequest(body);
    if (!validation.ok) {
      throw makeValidationError(validation.errors);
    }

    const typed = body as EdgeEventSummaryUpsertV77;

    // Contract requires circleId; also ensure it matches path.
    if (typed.circleId !== circleId) {
      throw makeValidationError([
        {
          instancePath: '/circleId',
          schemaPath: 'path.circleId',
          keyword: 'const',
          params: { allowedValue: circleId },
          message: 'circleId must match URL path parameter',
        } as any,
      ]);
    }

    const upsert = await this.svc.storeSummaryUpsert(typed);

    return {
      ok: true,
      applied: upsert.applied,
      reason: upsert.reason,
      serverReceivedAt: new Date().toISOString(),
    };
  }

  @Post(':eventId/incident/manifest-upsert')
  @UseGuards(DeviceKeyAuthGuard)
  async manifestUpsert(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('eventId') eventId: string,
    @Body() body: unknown,
  ) {
    const validation = this.contracts.validateEdgeIncidentManifestUpsertRequest(body);
    if (!validation.ok) {
      throw makeValidationError(validation.errors);
    }

    const typed = body as EdgeIncidentManifestUpsertV77;

    if (typed.circleId !== circleId) {
      throw makeValidationError([
        {
          instancePath: '/circleId',
          schemaPath: 'path.circleId',
          keyword: 'const',
          params: { allowedValue: circleId },
          message: 'circleId must match URL path parameter',
        } as any,
      ]);
    }

    if (typed.eventId !== eventId) {
      throw makeValidationError([
        {
          instancePath: '/eventId',
          schemaPath: 'path.eventId',
          keyword: 'const',
          params: { allowedValue: eventId },
          message: 'eventId must match URL path parameter',
        } as any,
      ]);
    }

    const upsert = await this.manifests.storeManifestUpsert(typed);

    return {
      ok: true,
      applied: upsert.applied,
      reason: upsert.reason,
      serverReceivedAt: new Date().toISOString(),
    };
  }
}
