import { Injectable, Logger } from '@nestjs/common';
import { PushProviderPort, PushPayload, PushResult } from './push-provider.port';

/**
 * MultiPushProvider - 多渠道推送聚合器
 * 
 * 用途：
 * 1. 根据设备平台选择合适的推送服务
 * 2. 支持同时发送到多个推送渠道（webpush + APNs）
 * 3. 统一处理推送结果
 * 
 * 设计：
 * - 每个设备 token 带有平台信息
 * - web 平台使用 WebPushProvider
 * - ios 平台使用 APNsPushProvider
 * - android 平台可以使用 FCM (未来扩展)
 */
@Injectable()
export class MultiPushProvider implements PushProviderPort {
  private readonly logger = new Logger(MultiPushProvider.name);

  constructor(
    private readonly webPushProvider: PushProviderPort,
    private readonly apnsPushProvider: PushProviderPort,
  ) {
    this.logger.log('MultiPushProvider initialized with WebPush and APNs');
  }

  /**
   * 根据平台选择推送提供商
   */
  private selectProvider(platform: string): PushProviderPort | null {
    switch (platform.toLowerCase()) {
      case 'web':
        return this.webPushProvider;
      case 'ios':
        return this.apnsPushProvider;
      case 'android':
        // 未来可以添加 FCM provider
        this.logger.warn('Android push not implemented yet');
        return null;
      default:
        this.logger.warn(`Unknown platform: ${platform}`);
        return null;
    }
  }

  /**
   * 发送单个推送（不推荐直接使用，因为无法指定平台）
   * 
   * 注意：此方法需要 token 包含平台信息，建议使用 sendByPlatform
   */
  async send(token: string, payload: PushPayload): Promise<PushResult> {
    // 尝试从 token 推断平台（web push token 通常是 JSON 格式）
    try {
      JSON.parse(token);
      // 如果能解析为 JSON，则可能是 web push
      return await this.webPushProvider.send(token, payload);
    } catch {
      // 否则假定为 iOS device token
      return await this.apnsPushProvider.send(token, payload);
    }
  }

  /**
   * 批量发送推送（不推荐直接使用）
   * 
   * 建议使用 sendBatchByPlatform 以便按平台分组发送
   */
  async sendBatch(tokens: string[], payload: PushPayload): Promise<PushResult[]> {
    const results: PushResult[] = [];
    
    for (const token of tokens) {
      const result = await this.send(token, payload);
      results.push(result);
    }
    
    return results;
  }

  /**
   * 根据平台发送推送（推荐使用）
   * 
   * @param platform 平台类型 ('web', 'ios', 'android')
   * @param token 推送 token
   * @param payload 推送内容
   */
  async sendByPlatform(
    platform: string,
    token: string,
    payload: PushPayload,
  ): Promise<PushResult> {
    const provider = this.selectProvider(platform);
    
    if (!provider) {
      return {
        success: false,
        error: `No provider available for platform: ${platform}`,
      };
    }
    
    return await provider.send(token, payload);
  }

  /**
   * 批量发送推送（按平台分组）
   * 
   * @param devices 设备列表，包含平台和 token 信息
   * @param payload 推送内容
   */
  async sendBatchByPlatform(
    devices: Array<{ platform: string; token: string }>,
    payload: PushPayload,
  ): Promise<PushResult[]> {
    // 按平台分组
    const devicesByPlatform = new Map<string, Array<{ token: string; index: number }>>();
    
    devices.forEach((device, index) => {
      const platform = device.platform.toLowerCase();
      if (!devicesByPlatform.has(platform)) {
        devicesByPlatform.set(platform, []);
      }
      devicesByPlatform.get(platform)!.push({ token: device.token, index });
    });

    // 为每个平台发送推送
    const results: PushResult[] = new Array(devices.length);
    
    for (const [platform, platformDevices] of devicesByPlatform.entries()) {
      const provider = this.selectProvider(platform);
      
      if (!provider) {
        // 标记为失败
        for (const { index } of platformDevices) {
          results[index] = {
            success: false,
            error: `No provider for platform: ${platform}`,
          };
        }
        continue;
      }

      // 批量发送
      const tokens = platformDevices.map(d => d.token);
      const platformResults = await provider.sendBatch(tokens, payload);
      
      // 将结果放回原始顺序
      platformDevices.forEach(({ index }, i) => {
        results[index] = platformResults[i];
      });
    }

    // 记录统计
    const byPlatform = new Map<string, { success: number; failed: number }>();
    devices.forEach((device, i) => {
      const platform = device.platform.toLowerCase();
      if (!byPlatform.has(platform)) {
        byPlatform.set(platform, { success: 0, failed: 0 });
      }
      const stats = byPlatform.get(platform)!;
      if (results[i].success) {
        stats.success++;
      } else {
        stats.failed++;
      }
    });

    // 记录日志
    for (const [platform, stats] of byPlatform.entries()) {
      this.logger.log(
        `${platform}: sent=${stats.success} failed=${stats.failed}`
      );
    }

    return results;
  }
}
