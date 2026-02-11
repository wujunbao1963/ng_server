import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as apn from '@parse/node-apn';
import { PushProviderPort, PushPayload, PushResult } from './push-provider.port';

/**
 * APNs Push Provider - iOS 原生推送实现
 * 
 * 用于向 iOS 设备发送原生推送通知
 * 使用 Apple Push Notification service (APNs)
 */
@Injectable()
export class APNsPushProvider implements PushProviderPort {
  private readonly logger = new Logger(APNsPushProvider.name);
  private provider: apn.Provider | null = null;
  private readonly bundleId: string;

  constructor(private readonly configService: ConfigService) {
    const keyId = this.configService.get<string>('APNS_KEY_ID');
    const teamId = this.configService.get<string>('APNS_TEAM_ID');
    const keyPath = this.configService.get<string>('APNS_KEY_PATH');
    const keyContent = this.configService.get<string>('APNS_KEY_CONTENT');
    this.bundleId = this.configService.get<string>('APNS_BUNDLE_ID') || 'com.neighbor-guard.app';
    const production = this.configService.get<string>('APNS_PRODUCTION') === 'true';

    // 支持两种配置方式：文件路径或直接内容
    if (keyId && teamId && (keyPath || keyContent)) {
      try {
        const options: apn.ProviderOptions = {
          token: {
            key: keyPath || keyContent!,
            keyId,
            teamId,
          },
          production,
        };

        this.provider = new apn.Provider(options);
        this.logger.log(`APNsPushProvider initialized (${production ? 'PRODUCTION' : 'SANDBOX'})`);
      } catch (error: any) {
        this.logger.error(`Failed to initialize APNs: ${error.message}`);
        this.provider = null;
      }
    } else {
      this.logger.warn('APNs not configured (missing APNS_KEY_ID, APNS_TEAM_ID, or APNS_KEY_PATH/APNS_KEY_CONTENT)');
    }
  }

  isConfigured(): boolean {
    return this.provider !== null;
  }

  /**
   * 发送单个推送到 iOS 设备
   */
  async send(token: string, payload: PushPayload): Promise<PushResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'APNs not configured' };
    }

    const notification = new apn.Notification();
    
    // 设置通知内容
    notification.alert = {
      title: payload.title,
      body: payload.body,
    };
    
    // 设置其他选项
    if (payload.badge !== undefined) {
      notification.badge = payload.badge;
    }
    
    if (payload.sound) {
      notification.sound = payload.sound;
    } else {
      notification.sound = 'default';
    }
    
    // 设置自定义数据
    if (payload.data) {
      notification.payload = payload.data;
    }
    
    // 设置 topic (bundle ID)
    notification.topic = this.bundleId;
    
    // 设置内容可用标志，让应用在后台也能接收
    notification.contentAvailable = true;
    
    try {
      const result = await this.provider!.send(notification, token);
      
      // 检查发送结果
      if (result.failed && result.failed.length > 0) {
        const failure = result.failed[0];
        const shouldRemove = failure.response?.reason === 'BadDeviceToken' || 
                            failure.response?.reason === 'Unregistered';
        
        this.logger.warn(
          `APNs push failed: ${failure.response?.reason || 'unknown'} for token ${token.slice(0, 10)}...`
        );
        
        return {
          success: false,
          error: failure.response?.reason || 'Unknown APNs error',
          errorCode: String(failure.status),
          shouldRemoveToken: shouldRemove,
        };
      }
      
      if (result.sent && result.sent.length > 0) {
        this.logger.debug(`APNs push sent to ${token.slice(0, 10)}...`);
        return {
          success: true,
          messageId: `apns-${Date.now()}`,
        };
      }
      
      // 未知状态
      this.logger.warn(`APNs push unknown status for token ${token.slice(0, 10)}...`);
      return {
        success: false,
        error: 'Unknown APNs status',
      };
      
    } catch (error: any) {
      this.logger.error(`APNs push error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 批量发送推送
   */
  async sendBatch(tokens: string[], payload: PushPayload): Promise<PushResult[]> {
    if (!this.isConfigured()) {
      this.logger.warn('APNs not configured, skipping send');
      return tokens.map(() => ({ success: false, error: 'APNs not configured' }));
    }

    const results: PushResult[] = [];

    for (const token of tokens) {
      const result = await this.send(token, payload);
      results.push(result);
    }

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    this.logger.log(`APNs batch complete: sent=${sent} failed=${failed}`);

    return results;
  }

  /**
   * 关闭 APNs 连接（用于优雅关闭）
   */
  async shutdown(): Promise<void> {
    if (this.provider) {
      this.provider.shutdown();
      this.logger.log('APNs provider shutdown');
    }
  }
}
