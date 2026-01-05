import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';

export interface PushProviderPort {
  sendBatch(tokens: string[], payload: { title: string; body: string; data?: any }): Promise<{
    sent: number;
    failed: number;
    invalidTokens: string[];
  }>;
}

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

  async sendBatch(
    tokens: string[],
    payload: { title: string; body: string; data?: any },
  ): Promise<{ sent: number; failed: number; invalidTokens: string[] }> {
    if (!this.isConfigured()) {
      this.logger.warn('Web Push not configured, skipping send');
      return { sent: 0, failed: tokens.length, invalidTokens: [] };
    }

    const results = { sent: 0, failed: 0, invalidTokens: [] as string[] };
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: payload.data || {},
    });

    for (const token of tokens) {
      try {
        // token 是 JSON 序列化的 PushSubscription
        const subscription = JSON.parse(token);
        
        await webpush.sendNotification(subscription, notificationPayload);
        results.sent++;
        this.logger.debug(`Push sent to ${subscription.endpoint.slice(-20)}`);
      } catch (error: any) {
        results.failed++;
        
        // 410 Gone 表示订阅已失效
        if (error.statusCode === 410 || error.statusCode === 404) {
          results.invalidTokens.push(token);
          this.logger.warn(`Subscription expired: ${token.slice(0, 50)}...`);
        } else {
          this.logger.error(`Push failed: ${error.message}`);
        }
      }
    }

    this.logger.log(`Push batch complete: sent=${results.sent} failed=${results.failed} invalid=${results.invalidTokens.length}`);
    return results;
  }
}
