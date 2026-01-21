import { Injectable, Logger, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { NgEdgeDevice } from '../edge-devices/ng-edge-device.entity';
import { CirclesService } from '../circles/circles.service';
import { ExecuteActionDto, HumanActionResultDto, EdgeDeviceInfo, HumanActionType } from './dto';

/**
 * RAHA Actions Service
 * 
 * Implements Phase 6: Server RAHA Forwarding
 * 
 * Flow:
 * 1. Mobile App calls Server with JWT auth
 * 2. Server validates user role in circle
 * 3. Server finds Edge device for circle
 * 4. Server forwards HumanAction to Edge
 * 5. Server returns HumanActionResult to Mobile App
 */
@Injectable()
export class RahaActionsService {
  private readonly logger = new Logger(RahaActionsService.name);
  private readonly defaultEdgeUrl: string | null;
  private readonly forwardTimeout: number;

  constructor(
    @InjectRepository(NgEdgeDevice)
    private readonly edgeDevicesRepo: Repository<NgEdgeDevice>,
    private readonly circlesService: CirclesService,
    private readonly config: ConfigService,
  ) {
    // Default Edge URL for development/testing
    this.defaultEdgeUrl = this.config.get<string>('DEFAULT_EDGE_URL') || null;
    this.forwardTimeout = parseInt(this.config.get<string>('RAHA_FORWARD_TIMEOUT_MS') || '10000', 10);
    
    this.logger.log(`Initialized with defaultEdgeUrl=${this.defaultEdgeUrl}, timeout=${this.forwardTimeout}ms`);
  }

  /**
   * Execute a RAHA by forwarding to Edge
   */
  async executeAction(
    userId: string,
    circleId: string,
    dto: ExecuteActionDto,
  ): Promise<HumanActionResultDto> {
    this.logger.log(`Executing ${dto.action} for user=${userId} circle=${circleId}`);

    // 1. Validate user has role in circle
    const userRole = await this.getUserRole(userId, circleId);
    if (!userRole) {
      throw new NotFoundException('User not found in circle');
    }

    // 2. Map Server role to RAHA actorRole
    const actorRole = this.mapToActorRole(userRole);
    if (!actorRole) {
      throw new BadRequestException(`Role ${userRole} cannot execute RAHA`);
    }

    // 3. Get Edge device for circle
    const edgeDevice = await this.getEdgeDevice(circleId);
    if (!edgeDevice) {
      throw new NotFoundException('No Edge device found for circle');
    }

    if (!edgeDevice.enabled) {
      throw new BadRequestException('Edge device is disabled');
    }

    // 4. Get Edge URL
    const edgeUrl = edgeDevice.edgeUrl || this.defaultEdgeUrl;
    if (!edgeUrl) {
      throw new ServiceUnavailableException('Edge URL not configured');
    }

    // 5. Build HumanAction request
    const requestId = crypto.randomUUID();
    const humanAction = {
      contractVersion: 'ng.edge.server/8.0',
      edgeSpecVersion: 'v7.7',
      edgeInstanceId: edgeDevice.edgeInstanceId || 'edge_001',
      requestId,
      idempotencyKey: `srv:${requestId}`,
      eventId: dto.eventId || null,
      actorId: userId,
      actorRole,
      action: dto.action,
      params: dto.params || {},
      deviceTime: new Date().toISOString(),
      monoTime: 0,
      timeQuality: 'SYNCED',
    };

    // 6. Forward to Edge
    const result = await this.forwardToEdge(edgeUrl, humanAction);

    this.logger.log(`RAHA ${dto.action} result: accepted=${result.accepted}`);
    return result;
  }

  /**
   * Get user's role in circle
   */
  private async getUserRole(userId: string, circleId: string): Promise<string | null> {
    try {
      // Use mustBeMember which returns the membership with role
      const membership = await this.circlesService.mustBeMember(userId, circleId);
      return membership.role;
    } catch (err) {
      this.logger.warn(`User ${userId} not a member of circle ${circleId}`);
      return null;
    }
  }

  /**
   * Map Server role to RAHA actorRole
   */
  private mapToActorRole(serverRole: string): string | null {
    const roleMap: Record<string, string | null> = {
      'owner': 'owner',
      'household': 'caretaker',  // household maps to caretaker
      'caretaker': 'caretaker',
      'acting_owner': 'acting_owner',
      'guest': null,  // guests cannot execute RAHA
      'witness': null,  // witnesses cannot execute RAHA
    };
    return roleMap[serverRole.toLowerCase()] ?? null;
  }

  /**
   * Get Edge device for circle
   */
  private async getEdgeDevice(circleId: string): Promise<EdgeDeviceInfo | null> {
    const device = await this.edgeDevicesRepo.findOne({
      where: { circleId },
      order: { createdAt: 'ASC' },
    });

    if (!device) {
      return null;
    }

    // Extract edgeUrl from metadata
    const metadata = device.metadata as Record<string, any> || {};

    return {
      deviceId: device.id,
      circleId: device.circleId,
      edgeUrl: metadata.edgeUrl || null,
      edgeInstanceId: metadata.edgeInstanceId || device.id,
      enabled: device.revokedAt === null,
    };
  }

  /**
   * Forward HumanAction to Edge
   */
  private async forwardToEdge(
    edgeUrl: string,
    humanAction: Record<string, any>,
  ): Promise<HumanActionResultDto> {
    const url = `${edgeUrl.replace(/\/$/, '')}/api/raha/execute`;

    this.logger.debug(`Forwarding RAHA to ${url}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.forwardTimeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(humanAction),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Edge returned ${response.status}: ${errorText}`);
        
        // Try to parse error response
        try {
          const errorJson = JSON.parse(errorText);
          return {
            requestId: humanAction.requestId,
            eventId: humanAction.eventId,
            accepted: false,
            rejectedCode: 'EDGE_ERROR',
            rejectedReason: errorJson.detail || errorJson.message || `HTTP ${response.status}`,
          };
        } catch {
          return {
            requestId: humanAction.requestId,
            eventId: humanAction.eventId,
            accepted: false,
            rejectedCode: 'EDGE_ERROR',
            rejectedReason: `Edge returned HTTP ${response.status}`,
          };
        }
      }

      const result = await response.json();
      
      return {
        requestId: result.requestId || humanAction.requestId,
        eventId: result.eventId || humanAction.eventId,
        accepted: result.accepted ?? false,
        rejectedCode: result.rejectedCode,
        rejectedReason: result.rejectedReason,
        activeResolver: result.activeResolver,
        lockExpiresAt: result.lockExpiresAt,
        ledgerSeqCommitted: result.ledgerSeqCommitted,
        fromState: result.fromState,
        toState: result.toState,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        this.logger.error(`RAHA forward timeout after ${this.forwardTimeout}ms`);
        return {
          requestId: humanAction.requestId,
          eventId: humanAction.eventId,
          accepted: false,
          rejectedCode: 'TIMEOUT',
          rejectedReason: `Edge did not respond within ${this.forwardTimeout}ms`,
        };
      }

      this.logger.error(`RAHA forward failed: ${err.message}`);
      return {
        requestId: humanAction.requestId,
        eventId: humanAction.eventId,
        accepted: false,
        rejectedCode: 'NETWORK_ERROR',
        rejectedReason: err.message || 'Failed to connect to Edge',
      };
    }
  }

  /**
   * Update Edge URL for a device
   */
  async updateEdgeUrl(
    userId: string,
    circleId: string,
    deviceId: string,
    edgeUrl: string,
  ): Promise<{ deviceId: string; edgeUrl: string }> {
    // Only owner can update Edge URL
    await this.circlesService.mustHaveRole(userId, circleId, ['owner']);

    const device = await this.edgeDevicesRepo.findOne({
      where: { id: deviceId, circleId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Update metadata with edgeUrl
    const metadata = (device.metadata as Record<string, any>) || {};
    metadata.edgeUrl = edgeUrl;

    await this.edgeDevicesRepo.update({ id: deviceId }, { metadata });

    this.logger.log(`Updated Edge URL for device ${deviceId}: ${edgeUrl}`);

    return { deviceId, edgeUrl };
  }

  /**
   * Get Edge URL for a device
   */
  async getEdgeUrl(
    userId: string,
    circleId: string,
    deviceId: string,
  ): Promise<{ deviceId: string; edgeUrl: string | null }> {
    await this.circlesService.mustHaveRole(userId, circleId, ['owner', 'household']);

    const device = await this.edgeDevicesRepo.findOne({
      where: { id: deviceId, circleId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const metadata = (device.metadata as Record<string, any>) || {};

    return {
      deviceId,
      edgeUrl: metadata.edgeUrl || this.defaultEdgeUrl || null,
    };
  }
}
