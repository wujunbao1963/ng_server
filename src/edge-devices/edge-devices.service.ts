import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { NgEdgeDevice } from './ng-edge-device.entity';
import { RegisterEdgeDeviceDto } from './dto/register-edge-device.dto';
import { CirclesService } from '../circles/circles.service';
import { NgHttpError, NgErrorCodes } from '../common/errors/ng-http-error';

export type RegisterEdgeDeviceResponse = {
  deviceId: string;
  deviceKey: string;
  pairedAt: string;
  capabilities: {
    fusion: boolean;
    evidenceUpload: boolean;
    topomap: boolean;
  };
};

export type EdgeBindingInfo = {
  circleId: string;
  circleName: string;
  deviceId: string;
  deviceKey: string;
  serverUrl: string;
  generatedAt: string;
  expiresAt: string;
};

function genDeviceKey(): string {
  const bytes = crypto.randomBytes(32);
  return bytes.toString('base64');
}

function hmacSha256Hex(pepper: string, value: string): string {
  return crypto.createHmac('sha256', pepper).update(value).digest('hex');
}

@Injectable()
export class EdgeDevicesService {
  constructor(
    @InjectRepository(NgEdgeDevice)
    private readonly repo: Repository<NgEdgeDevice>,
    private readonly config: ConfigService,
    private readonly circles: CirclesService,
  ) {}

  // ==========================================================================
  // 生成绑定信息 (Owner only)
  // ==========================================================================

  /**
   * 生成 Edge 绑定信息
   * 
   * POST /api/circles/:circleId/edge/generate-binding
   * 
   * - 只有 Owner 可以调用
   * - 检查 Circle 是否已有 active Edge
   * - 预注册设备，返回绑定信息
   */
  async generateBinding(userId: string, circleId: string): Promise<EdgeBindingInfo> {
    // 检查权限 - 只有 Owner
    await this.circles.mustHaveRole(userId, circleId, ['owner']);

    // 检查是否已有 active Edge
    const existingDevice = await this.repo.findOne({
      where: { circleId, revokedAt: IsNull() },
    });

    if (existingDevice) {
      throw new NgHttpError({
        statusCode: 409,
        error: 'Conflict',
        code: 'CONFLICT',
        message: 'Circle already has an active Edge device. Revoke it first to bind a new one.',
        timestamp: new Date().toISOString(),
        retryable: false,
        details: {
          existingDeviceId: existingDevice.id,
          existingDeviceName: existingDevice.name,
        },
      });
    }

    // 获取 Circle 信息
    const circleDetail = await this.circles.getCircleDetail(userId, circleId);

    // 生成设备凭证
    const deviceId = crypto.randomUUID();
    const deviceKey = genDeviceKey();
    const pepper = this.config.get<string>('DEVICE_KEY_PEPPER') ?? 'dev-pepper';
    const deviceKeyHash = hmacSha256Hex(pepper, deviceKey);

    // 预注册设备 (status = pending binding)
    const entity = this.repo.create({
      id: deviceId,
      circleId,
      name: 'Pending Binding',
      deviceKeyHash,
      capabilities: {
        fusion: false,
        evidenceUpload: false,
        topomap: false,
      },
      metadata: {
        bindingStatus: 'pending',
        generatedAt: new Date().toISOString(),
        generatedBy: userId,
      },
      revokedAt: null,
      lastSeenAt: null,
    });
    await this.repo.save(entity);

    // 获取 Server URL
    const serverUrl = this.config.get<string>('SERVER_URL') 
      ?? this.config.get<string>('RAILWAY_PUBLIC_DOMAIN')
        ? `https://${this.config.get<string>('RAILWAY_PUBLIC_DOMAIN')}`
        : 'http://localhost:3000';

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 小时后过期

    return {
      circleId,
      circleName: circleDetail.circle.name,
      deviceId,
      deviceKey,
      serverUrl,
      generatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  // ==========================================================================
  // 获取绑定状态
  // ==========================================================================

  /**
   * 获取 Circle 的 Edge 绑定状态
   * 
   * GET /api/circles/:circleId/edge/binding-status
   */
  async getBindingStatus(userId: string, circleId: string): Promise<{
    hasBoundDevice: boolean;
    device: {
      deviceId: string;
      name: string | null;
      enabled: boolean;
      pairedAt: string;
      lastSeenAt: string | null;
      bindingStatus: string;
    } | null;
  }> {
    await this.circles.mustHaveRole(userId, circleId, ['owner', 'caretaker']);

    const device = await this.repo.findOne({
      where: { circleId, revokedAt: IsNull() },
    });

    if (!device) {
      return { hasBoundDevice: false, device: null };
    }

    return {
      hasBoundDevice: true,
      device: {
        deviceId: device.id,
        name: device.name,
        enabled: device.revokedAt == null,
        pairedAt: device.createdAt.toISOString(),
        lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
        bindingStatus: (device.metadata as any)?.bindingStatus ?? 'active',
      },
    };
  }

  // ==========================================================================
  // 确认绑定 (Edge 调用)
  // ==========================================================================

  /**
   * Edge 确认绑定完成
   * 
   * 由 Edge 在首次连接时调用，更新设备名称和能力
   */
  async confirmBinding(
    deviceId: string,
    dto: {
      deviceName?: string;
      capabilities?: { fusion?: boolean; evidenceUpload?: boolean; topomap?: boolean };
      platform?: string;
      softwareVersion?: string;
    },
  ): Promise<{ confirmed: boolean; deviceId: string }> {
    const device = await this.repo.findOne({ where: { id: deviceId } });
    if (!device) {
      throw new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: NgErrorCodes.NOT_FOUND,
        message: 'Device not found',
        timestamp: new Date().toISOString(),
        retryable: false,
      });
    }

    // 更新设备信息
    device.name = dto.deviceName ?? device.name;
    device.capabilities = {
      fusion: dto.capabilities?.fusion ?? false,
      evidenceUpload: dto.capabilities?.evidenceUpload ?? false,
      topomap: dto.capabilities?.topomap ?? false,
    };
    device.metadata = {
      ...device.metadata,
      bindingStatus: 'active',
      confirmedAt: new Date().toISOString(),
      platform: dto.platform ?? (device.metadata as any)?.platform,
      softwareVersion: dto.softwareVersion ?? (device.metadata as any)?.softwareVersion,
    };
    device.lastSeenAt = new Date();

    await this.repo.save(device);

    return { confirmed: true, deviceId };
  }

  // ==========================================================================
  // 撤销绑定 (Owner only)
  // ==========================================================================

  /**
   * 撤销 Edge 绑定
   * 
   * DELETE /api/circles/:circleId/edge/binding
   */
  async revokeBinding(userId: string, circleId: string): Promise<{
    revoked: boolean;
    deviceId: string;
  }> {
    await this.circles.mustHaveRole(userId, circleId, ['owner']);

    const device = await this.repo.findOne({
      where: { circleId, revokedAt: IsNull() },
    });

    if (!device) {
      throw new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: NgErrorCodes.NOT_FOUND,
        message: 'No active Edge device found',
        timestamp: new Date().toISOString(),
        retryable: false,
      });
    }

    device.revokedAt = new Date();
    device.metadata = {
      ...device.metadata,
      bindingStatus: 'revoked',
      revokedAt: new Date().toISOString(),
      revokedBy: userId,
    };

    await this.repo.save(device);

    return { revoked: true, deviceId: device.id };
  }

  // ==========================================================================
  // 原有方法 (保留兼容)
  // ==========================================================================

  async register(userId: string, circleId: string, dto: RegisterEdgeDeviceDto): Promise<RegisterEdgeDeviceResponse> {
    // 只有 Owner 可以注册设备
    await this.circles.mustHaveRole(userId, circleId, ['owner']);

    // 检查是否已有 active Edge
    const existingDevice = await this.repo.findOne({
      where: { circleId, revokedAt: IsNull() },
    });

    if (existingDevice) {
      throw new NgHttpError({
        statusCode: 409,
        error: 'Conflict',
        code: 'CONFLICT',
        message: 'Circle already has an active Edge device. Revoke it first.',
        timestamp: new Date().toISOString(),
        retryable: false,
        details: {
          existingDeviceId: existingDevice.id,
        },
      });
    }

    const deviceId = crypto.randomUUID();
    const deviceKey = genDeviceKey();

    const pepper = this.config.get<string>('DEVICE_KEY_PEPPER') ?? 'dev-pepper';
    const deviceKeyHash = hmacSha256Hex(pepper, deviceKey);

    const caps = {
      fusion: dto.capabilities?.fusion ?? false,
      evidenceUpload: dto.capabilities?.evidenceUpload ?? false,
      topomap: dto.capabilities?.topomap ?? false,
    };

    const metadata = {
      platform: dto.platform ?? null,
      haInstanceId: dto.haInstanceId ?? null,
      softwareVersion: dto.softwareVersion ?? null,
      publicKey: dto.publicKey ?? null,
      bindingStatus: 'active',
    };

    const entity = this.repo.create({
      id: deviceId,
      circleId,
      name: dto.deviceName ?? null,
      deviceKeyHash,
      capabilities: caps,
      metadata,
      revokedAt: null,
      lastSeenAt: null,
    });

    await this.repo.save(entity);

    return {
      deviceId,
      deviceKey,
      pairedAt: new Date().toISOString(),
      capabilities: caps,
    };
  }

  async list(userId: string, circleId: string): Promise<Array<{
    deviceId: string;
    name: string | null;
    enabled: boolean;
    pairedAt: string;
    lastSeenAt: string | null;
    capabilities: { fusion: boolean; evidenceUpload: boolean; topomap: boolean };
    metadata: Record<string, any> | null;
  }>> {
    await this.circles.mustHaveRole(userId, circleId, ['owner', 'caretaker']);
    const rows = await this.repo.find({
      where: { circleId },
      order: { createdAt: 'ASC' as any },
    });

    return rows.map((d) => ({
      deviceId: d.id,
      name: d.name ?? null,
      enabled: d.revokedAt == null,
      pairedAt: d.createdAt.toISOString(),
      lastSeenAt: d.lastSeenAt ? d.lastSeenAt.toISOString() : null,
      capabilities: {
        fusion: !!(d.capabilities as any)?.fusion,
        evidenceUpload: !!(d.capabilities as any)?.evidenceUpload,
        topomap: !!(d.capabilities as any)?.topomap,
      },
      metadata: d.metadata ?? null,
    }));
  }

  async setEnabled(
    userId: string,
    circleId: string,
    deviceId: string,
    enabled: boolean,
  ): Promise<{ deviceId: string; enabled: boolean }> {
    await this.circles.mustHaveRole(userId, circleId, ['owner']);
    const device = await this.repo.findOne({ where: { id: deviceId, circleId } });
    if (!device) {
      throw new Error('DEVICE_NOT_FOUND');
    }
    const revokedAt = enabled ? null : new Date();
    await this.repo.update({ id: deviceId }, { revokedAt });
    return { deviceId, enabled };
  }

  async rotateKey(
    userId: string,
    circleId: string,
    deviceId: string,
  ): Promise<{ deviceId: string; deviceKey: string; rotatedAt: string }> {
    await this.circles.mustHaveRole(userId, circleId, ['owner']);
    const device = await this.repo.findOne({ where: { id: deviceId, circleId } });
    if (!device) {
      throw new Error('DEVICE_NOT_FOUND');
    }
    const deviceKey = genDeviceKey();
    const pepper = this.config.get<string>('DEVICE_KEY_PEPPER') ?? 'dev-pepper';
    const deviceKeyHash = hmacSha256Hex(pepper, deviceKey);

    await this.repo.update({ id: deviceId }, { deviceKeyHash, revokedAt: null });

    return { deviceId, deviceKey, rotatedAt: new Date().toISOString() };
  }
}
