import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PushProviderPort, PushPayload, PushResult } from './push-provider.port';

@Injectable()
export class WebPushProvider implements PushProviderPort {
  private readonly logger = new Logger(WebPushProvider.name);
  private readonly vapidPublicKey: string;
  private readonly vapidPrivateKey: string;
  private readonly vapidSubject: string;

  constructor(private readonly configService: ConfigService) {
    this.vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY') || '';
    this.vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY') || '';
    this.vapidSubject = this.configService.get<string>('VAPID_SUBJECT') || 'mailto:admin@example.com';

    if (this.vapidPublicKey && this.vapidPrivateKey) {
      webpush.setVapidDetails(
        this.vapidSubject,
        this.vapidPublicKey,
        this.vapidPrivateKey,
      );
      this.logger.log('WebPushProvider initialized with VAPID keys');
    } else {
      this.logger.warn('VAPID keys not configured, Web Push will not work');
    }
  }

  getVapidPublicKey(): string | null {
    return this.vapidPublicKey || null;
  }

  isConfigured(): boolean {
    return !!(this.vapidPublicKey && this.vapidPrivateKey);
  }

  /**
   * 发送单个推送
   */
  async send(token: string, payload: PushPayload): Promise<PushResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Web Push not configured' };
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: payload.data || {},
    });

    try {
      const subscription = JSON.parse(token);
      const response = await webpush.sendNotification(subscription, notificationPayload);
      this.logger.debug(`Push sent to ${subscription.endpoint.slice(-20)}`);
      return { success: true, messageId: response.headers?.['message-id'] || 'sent' };
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        this.logger.warn(`Subscription expired: ${token.slice(0, 50)}...`);
        return { success: false, error: 'Subscription expired', shouldRemoveToken: true };
      }
      this.logger.error(`Push failed: ${error.message}`);
      return { success: false, error: error.message, errorCode: String(error.statusCode) };
    }
  }

  /**
   * 批量发送推送 - 返回与 tokens 顺序对应的结果数组
   */
  async sendBatch(tokens: string[], payload: PushPayload): Promise<PushResult[]> {
    if (!this.isConfigured()) {
      this.logger.warn('Web Push not configured, skipping send');
      return tokens.map(() => ({ success: false, error: 'Web Push not configured' }));
    }

    const results: PushResult[] = [];

    for (const token of tokens) {
      const result = await this.send(token, payload);
      results.push(result);
    }

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    this.logger.log(`Push batch complete: sent=${sent} failed=${failed}`);

    return results;
  }
}
