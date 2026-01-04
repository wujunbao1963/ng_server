import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { DeviceKeyAuthGuard } from '../device-auth/device-key-auth.guard';
import { NgDevice } from '../device-auth/ng-device.decorator';
import { NgEdgeDevice } from '../edge-devices/ng-edge-device.entity';
import { ContractsValidatorService } from '../common/contracts/contracts-validator.service';
import { makeValidationError } from '../common/errors/ng-http-error';
import { EvidenceService } from './evidence.service';
import { CirclesService } from '../circles/circles.service';
import { JwtUser } from '../auth/auth.types';
import { CompleteEvidenceUseCase } from '../application/usecases';
import { getRequestId } from '../infra/interceptors/request-id.interceptor';

@Controller('/api/circles/:circleId/events/:eventId/evidence')
export class EvidenceController {
  constructor(
    private readonly contracts: ContractsValidatorService,
    private readonly svc: EvidenceService,
    private readonly circles: CirclesService,
    private readonly completeEvidenceUseCase: CompleteEvidenceUseCase,
  ) {}

  @Post('upload-session')
  @UseGuards(DeviceKeyAuthGuard)
  async createUploadSession(
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('eventId', new ParseUUIDPipe({ version: '4' })) eventId: string,
    @NgDevice() device: NgEdgeDevice,
    @Body() body: unknown,
  ) {
    const vr = this.contracts.validateEvidenceUploadSessionRequest(body);
    if (!vr.ok) throw makeValidationError(vr.errors);

    const resp = await this.svc.createUploadSession(device, circleId, eventId, body as any);
    const out = this.contracts.validateEvidenceUploadSessionResponse(resp);
    if (!out.ok) throw makeValidationError(out.errors);
    return resp;
  }

  /**
   * Complete evidence upload (device auth)
   * POST /api/circles/:circleId/events/:eventId/evidence/complete
   */
  @Post('complete')
  @UseGuards(DeviceKeyAuthGuard)
  async complete(
    @Req() req: Request,
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('eventId', new ParseUUIDPipe({ version: '4' })) eventId: string,
    @NgDevice() device: NgEdgeDevice,
    @Body() body: unknown,
  ) {
    // 1. Contract validation (Controller responsibility)
    const vr = this.contracts.validateEvidenceCompleteRequest(body);
    if (!vr.ok) throw makeValidationError(vr.errors);

    const typed = body as {
      sessionId: string;
      manifest: { items: any[] };
      reportPackage?: { included: boolean; type?: string; sha256?: string };
    };

    // 2. Delegate to UseCase for business logic
    const resp = await this.completeEvidenceUseCase.execute({
      device,
      circleId,
      eventId,
      sessionId: typed.sessionId,
      manifest: typed.manifest,
      reportPackage: typed.reportPackage,
      requestId: getRequestId(req),
    });

    // 3. Validate response (Controller responsibility)
    const out = this.contracts.validateEvidenceCompleteResponse(resp);
    if (!out.ok) throw makeValidationError(out.errors);
    return resp;
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getEvidence(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('eventId', new ParseUUIDPipe({ version: '4' })) eventId: string,
  ) {
    await this.circles.mustBeMember(req.user.userId, circleId);
    const resp = await this.svc.getEvidence(circleId, eventId);
    const out = this.contracts.validateEvidenceGetResponse(resp);
    if (!out.ok) throw makeValidationError(out.errors);
    return resp;
  }

  @Post('items/:sha256/download-url')
  @UseGuards(AuthGuard('jwt'))
  async downloadUrl(
    @Req() req: { user: JwtUser },
    @Param('circleId', new ParseUUIDPipe({ version: '4' })) circleId: string,
    @Param('eventId', new ParseUUIDPipe({ version: '4' })) eventId: string,
    @Param('sha256') sha256: string,
  ) {
    await this.circles.mustBeMember(req.user.userId, circleId);
    const resp = await this.svc.getDownloadUrl(circleId, eventId, sha256);
    const out = this.contracts.validateEvidenceDownloadUrlResponse(resp);
    if (!out.ok) throw makeValidationError(out.errors);
    return resp;
  }
}
