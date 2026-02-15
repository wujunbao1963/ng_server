import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as http2 from 'http2';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import { PushProviderPort, PushPayload, PushResult } from './push-provider.port';

@Injectable()
export class ApnsPushProvider implements PushProviderPort, OnModuleDestroy {
  private readonly logger = new Logger(ApnsPushProvider.name);

  private readonly keyId: string;
  private readonly teamId: string;
  private readonly bundleId: string;
  private readonly key: string;
  private readonly host: string;

  private client: http2.ClientHttp2Session | null = null;
  private cachedToken: string | null = null;
  private tokenGeneratedAt = 0;

  /** Token refresh interval: 50 minutes (Apple max is 1 hour) */
  private static readonly TOKEN_TTL_MS = 50 * 60 * 1000;

  constructor(private readonly configService: ConfigService) {
    this.keyId = this.configService.get<string>('APNS_KEY_ID') || '';
    this.teamId = this.configService.get<string>('APNS_TEAM_ID') || '';
    this.bundleId = this.configService.get<string>('APNS_BUNDLE_ID') || '';

    const keyPath = this.configService.get<string>('APNS_KEY_PATH') || '';
    const keyContent = this.configService.get<string>('APNS_KEY_CONTENT') || '';
    this.key = keyContent || (keyPath ? fs.readFileSync(keyPath, 'utf8') : '');

    const env = this.configService.get<string>('APNS_ENVIRONMENT') || 'production';
    this.host = env === 'development'
      ? 'api.sandbox.push.apple.com'
      : 'api.push.apple.com';

    if (this.isConfigured()) {
      this.logger.log(`ApnsPushProvider initialized (env=${env}, bundleId=${this.bundleId})`);
    } else {
      this.logger.warn('APNS not fully configured, iOS push will not work');
    }
  }

  isConfigured(): boolean {
    return !!(this.keyId && this.teamId && this.bundleId && this.key);
  }

  onModuleDestroy() {
    this.destroyClient();
  }

  async send(token: string, payload: PushPayload): Promise<PushResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'APNS not configured' };
    }

    const apnsPayload = this.buildApnsPayload(payload);
    const jwtToken = this.getOrRefreshToken();

    try {
      return await this.sendRequest(token, apnsPayload, jwtToken);
    } catch (error: any) {
      // On connection error, destroy client and retry once
      if (error.code === 'ERR_HTTP2_GOAWAY_SESSION' || error.code === 'ECONNRESET') {
        this.destroyClient();
        try {
          return await this.sendRequest(token, apnsPayload, jwtToken);
        } catch (retryError: any) {
          this.logger.error(`APNS retry failed: ${retryError.message}`);
          return { success: false, error: retryError.message };
        }
      }
      this.logger.error(`APNS send failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async sendBatch(tokens: string[], payload: PushPayload): Promise<PushResult[]> {
    if (!this.isConfigured()) {
      this.logger.warn('APNS not configured, skipping send');
      return tokens.map(() => ({ success: false, error: 'APNS not configured' }));
    }

    const results: PushResult[] = [];
    for (const token of tokens) {
      const result = await this.send(token, payload);
      results.push(result);
    }

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    this.logger.log(`APNS batch complete: sent=${sent} failed=${failed}`);

    return results;
  }

  private buildApnsPayload(payload: PushPayload): string {
    const aps: Record<string, any> = {
      alert: { title: payload.title, body: payload.body },
      sound: payload.sound || 'default',
      'mutable-content': 1,
    };

    if (payload.badge !== undefined) {
      aps.badge = payload.badge;
    }

    return JSON.stringify({
      aps,
      ...payload.data,
    });
  }

  private getOrRefreshToken(): string {
    const now = Date.now();
    if (this.cachedToken && now - this.tokenGeneratedAt < ApnsPushProvider.TOKEN_TTL_MS) {
      return this.cachedToken;
    }

    const token = jwt.sign({}, this.key, {
      algorithm: 'ES256',
      keyid: this.keyId,
      issuer: this.teamId,
      expiresIn: '1h',
    });

    this.cachedToken = token;
    this.tokenGeneratedAt = now;
    this.logger.debug('APNS JWT token refreshed');
    return token;
  }

  private getClient(): http2.ClientHttp2Session {
    if (this.client && !this.client.closed && !this.client.destroyed) {
      return this.client;
    }

    this.client = http2.connect(`https://${this.host}`);

    this.client.on('error', (err) => {
      this.logger.error(`APNS HTTP/2 connection error: ${err.message}`);
    });

    this.client.on('goaway', () => {
      this.logger.warn('APNS server sent GOAWAY, will reconnect on next request');
      this.destroyClient();
    });

    return this.client;
  }

  private destroyClient() {
    if (this.client) {
      try {
        this.client.close();
      } catch {
        // ignore
      }
      this.client = null;
    }
  }

  private sendRequest(
    deviceToken: string,
    payload: string,
    jwtToken: string,
  ): Promise<PushResult> {
    return new Promise((resolve, reject) => {
      const client = this.getClient();

      const headers: http2.OutgoingHttpHeaders = {
        ':method': 'POST',
        ':path': `/3/device/${deviceToken}`,
        'authorization': `bearer ${jwtToken}`,
        'apns-topic': this.bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      };

      const req = client.request(headers);
      req.setEncoding('utf8');

      let responseData = '';
      let statusCode: number | undefined;

      req.on('response', (headers) => {
        statusCode = headers[':status'] as number;
      });

      req.on('data', (chunk: string) => {
        responseData += chunk;
      });

      req.on('end', () => {
        if (statusCode === 200) {
          resolve({ success: true, messageId: `apns-${deviceToken.slice(-8)}` });
          return;
        }

        let errorReason = 'Unknown';
        try {
          const body = JSON.parse(responseData);
          errorReason = body.reason || 'Unknown';
        } catch {
          // ignore parse error
        }

        const shouldRemoveToken = [
          'BadDeviceToken',
          'Unregistered',
          'DeviceTokenNotForTopic',
          'ExpiredToken',
        ].includes(errorReason);

        this.logger.warn(`APNS error: status=${statusCode} reason=${errorReason} token=${deviceToken.slice(-8)}`);

        resolve({
          success: false,
          error: errorReason,
          errorCode: String(statusCode),
          shouldRemoveToken,
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(payload);
      req.end();
    });
  }
}
