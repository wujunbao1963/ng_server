import { Injectable } from '@nestjs/common';
import { NgLoggerService } from './logger.service';

/**
 * 推送消息载荷
 */
export interface PushPayload {
  /** 通知标题 */
  title: string;
  /** 通知正文 */
  body: string;
  /** 自定义数据 */
  data?: Record<string, string>;
  /** 图标 URL */
  imageUrl?: string;
  /** 点击行为 */
  clickAction?: string;
  /** 声音 */
  sound?: string;
  /** 角标数字 */
  badge?: number;
  /** 优先级 */
  priority?: 'normal' | 'high';
  /** TTL (秒) */
  ttl?: number;
}

/**
 * 推送结果
 */
export interface PushResult {
  /** 是否成功 */
  success: boolean;
  /** 消息 ID（成功时） */
  messageId?: string;
  /** 错误代码（失败时） */
  errorCode?: string;
  /** 错误信息（失败时） */
  errorMessage?: string;
  /** 是否应该重试 */
  retryable?: boolean;
  /** Token 是否无效（需要清理） */
  tokenInvalid?: boolean;
}

/**
 * 批量推送结果
 */
export interface BatchPushResult {
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failureCount: number;
  /** 各个结果 */
  results: Array<{
    token: string;
    result: PushResult;
  }>;
  /** 需要清理的无效 token */
  invalidTokens: string[];
}

/**
 * PushProviderPort - 推送服务抽象接口
 *
 * 定义推送服务的标准接口，支持：
 * - 单设备推送
 * - 批量推送
 * - 多平台（FCM, APNs）
 *
 * 实现者需要处理：
 * - 平台特定的 API 调用
 * - 错误重试逻辑
 * - Token 有效性检测
 */
export interface PushProviderPort {
  /**
   * 发送单条推送
   *
   * @param token 设备推送 token
   * @param payload 推送内容
   * @param platform 平台类型
   */
  send(
    token: string,
    payload: PushPayload,
    platform: 'fcm' | 'apns',
  ): Promise<PushResult>;

  /**
   * 批量发送推送
   *
   * @param tokens 设备 token 列表
   * @param payload 推送内容
   * @param platform 平台类型
   */
  sendBatch(
    tokens: string[],
    payload: PushPayload,
    platform: 'fcm' | 'apns',
  ): Promise<BatchPushResult>;

  /**
   * 检查服务是否可用
   */
  isAvailable(): Promise<boolean>;
}

// Provider token for dependency injection
export const PUSH_PROVIDER_PORT = Symbol('PUSH_PROVIDER_PORT');

/**
 * MockPushProvider - 测试用 Mock 实现
 *
 * 记录所有推送请求，便于测试验证
 */
@Injectable()
export class MockPushProvider implements PushProviderPort {
  private readonly logger: NgLoggerService;

  /** 记录的推送请求 */
  public readonly sentMessages: Array<{
    token: string;
    payload: PushPayload;
    platform: string;
    timestamp: Date;
  }> = [];

  /** 模拟的失败 token */
  public failingTokens: Set<string> = new Set();

  /** 模拟的无效 token */
  public invalidTokens: Set<string> = new Set();

  constructor(logger: NgLoggerService) {
    this.logger = logger.setContext('MockPushProvider');
  }

  async send(
    token: string,
    payload: PushPayload,
    platform: 'fcm' | 'apns',
  ): Promise<PushResult> {
    this.logger.log('Mock push send', {
      token: token.substring(0, 8) + '...',
      title: payload.title,
      platform,
    });

    this.sentMessages.push({
      token,
      payload,
      platform,
      timestamp: new Date(),
    });

    // 模拟无效 token
    if (this.invalidTokens.has(token)) {
      return {
        success: false,
        errorCode: 'INVALID_TOKEN',
        errorMessage: 'The registration token is not a valid FCM registration token',
        retryable: false,
        tokenInvalid: true,
      };
    }

    // 模拟失败
    if (this.failingTokens.has(token)) {
      return {
        success: false,
        errorCode: 'UNAVAILABLE',
        errorMessage: 'Service temporarily unavailable',
        retryable: true,
        tokenInvalid: false,
      };
    }

    // 模拟成功
    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  async sendBatch(
    tokens: string[],
    payload: PushPayload,
    platform: 'fcm' | 'apns',
  ): Promise<BatchPushResult> {
    this.logger.log('Mock push sendBatch', {
      tokenCount: tokens.length,
      title: payload.title,
      platform,
    });

    const results: BatchPushResult['results'] = [];
    const invalidTokensList: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const token of tokens) {
      const result = await this.send(token, payload, platform);
      results.push({ token, result });

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
        if (result.tokenInvalid) {
          invalidTokensList.push(token);
        }
      }
    }

    return {
      successCount,
      failureCount,
      results,
      invalidTokens: invalidTokensList,
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * 清除记录（测试用）
   */
  clear(): void {
    this.sentMessages.length = 0;
    this.failingTokens.clear();
    this.invalidTokens.clear();
  }

  /**
   * 设置 token 为失败状态（测试用）
   */
  setTokenFailing(token: string): void {
    this.failingTokens.add(token);
  }

  /**
   * 设置 token 为无效状态（测试用）
   */
  setTokenInvalid(token: string): void {
    this.invalidTokens.add(token);
  }
}

/**
 * FCMPushProvider - Firebase Cloud Messaging 实现
 *
 * 生产环境使用，需要配置 Firebase Admin SDK
 */
@Injectable()
export class FCMPushProvider implements PushProviderPort {
  private readonly logger: NgLoggerService;
  private firebaseApp: any = null;
  private initialized = false;

  constructor(logger: NgLoggerService) {
    this.logger = logger.setContext('FCMPushProvider');
  }

  /**
   * 延迟初始化 Firebase Admin SDK
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      // 动态导入避免在 mock 模式下加载
      const admin = await import('firebase-admin');

      if (!admin.apps.length) {
        // 从环境变量或服务账户文件初始化
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
        const projectId = process.env.FIREBASE_PROJECT_ID;

        if (serviceAccount) {
          const credential = admin.credential.cert(serviceAccount);
          this.firebaseApp = admin.initializeApp({ credential, projectId });
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          this.firebaseApp = admin.initializeApp({ projectId });
        } else {
          throw new Error('Firebase credentials not configured');
        }
      } else {
        this.firebaseApp = admin.apps[0];
      }

      this.initialized = true;
      this.logger.log('Firebase Admin SDK initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', String(error));
      throw error;
    }
  }

  async send(
    token: string,
    payload: PushPayload,
    platform: 'fcm' | 'apns',
  ): Promise<PushResult> {
    await this.ensureInitialized();

    const admin = await import('firebase-admin');
    const messaging = admin.messaging();

    const message: any = {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data,
      android: {
        priority: payload.priority === 'high' ? 'high' : 'normal',
        ttl: payload.ttl ? payload.ttl * 1000 : undefined,
        notification: {
          sound: payload.sound || 'default',
          clickAction: payload.clickAction,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: payload.sound || 'default',
            badge: payload.badge,
          },
        },
      },
    };

    try {
      const response = await messaging.send(message);
      this.logger.log('Push sent successfully', {
        messageId: response,
        token: token.substring(0, 8) + '...',
      });

      return {
        success: true,
        messageId: response,
      };
    } catch (error: any) {
      const errorCode = error.code || 'UNKNOWN';
      const errorMessage = error.message || 'Unknown error';

      this.logger.error('Push send failed', errorMessage, {
        errorCode,
        token: token.substring(0, 8) + '...',
      });

      // 检查是否为无效 token
      const tokenInvalid = [
        'messaging/invalid-registration-token',
        'messaging/registration-token-not-registered',
      ].includes(errorCode);

      // 检查是否可重试
      const retryable = [
        'messaging/server-unavailable',
        'messaging/internal-error',
      ].includes(errorCode);

      return {
        success: false,
        errorCode,
        errorMessage,
        retryable,
        tokenInvalid,
      };
    }
  }

  async sendBatch(
    tokens: string[],
    payload: PushPayload,
    platform: 'fcm' | 'apns',
  ): Promise<BatchPushResult> {
    await this.ensureInitialized();

    const admin = await import('firebase-admin');
    const messaging = admin.messaging();

    const message: any = {
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data,
      android: {
        priority: payload.priority === 'high' ? 'high' : 'normal',
        notification: {
          sound: payload.sound || 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: payload.sound || 'default',
            badge: payload.badge,
          },
        },
      },
    };

    try {
      const response = await messaging.sendEachForMulticast({
        tokens,
        ...message,
      });

      const results: BatchPushResult['results'] = [];
      const invalidTokensList: string[] = [];

      response.responses.forEach((resp: any, idx: number) => {
        const token = tokens[idx];
        if (resp.success) {
          results.push({
            token,
            result: { success: true, messageId: resp.messageId },
          });
        } else {
          const errorCode = resp.error?.code || 'UNKNOWN';
          const tokenInvalid = [
            'messaging/invalid-registration-token',
            'messaging/registration-token-not-registered',
          ].includes(errorCode);

          if (tokenInvalid) {
            invalidTokensList.push(token);
          }

          results.push({
            token,
            result: {
              success: false,
              errorCode,
              errorMessage: resp.error?.message,
              tokenInvalid,
              retryable: !tokenInvalid,
            },
          });
        }
      });

      this.logger.log('Batch push completed', {
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        results,
        invalidTokens: invalidTokensList,
      };
    } catch (error: any) {
      this.logger.error('Batch push failed', error.message);

      // 全部失败
      return {
        successCount: 0,
        failureCount: tokens.length,
        results: tokens.map((token) => ({
          token,
          result: {
            success: false,
            errorCode: error.code || 'UNKNOWN',
            errorMessage: error.message,
            retryable: true,
          },
        })),
        invalidTokens: [],
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      return true;
    } catch {
      return false;
    }
  }
}
