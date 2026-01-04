import { Injectable, Logger } from '@nestjs/common';
import { PushProviderPort, PushPayload, PushResult } from './push-provider.port';

/**
 * MockPushProvider - 模拟推送服务
 * 
 * 用于开发和测试环境，不实际发送推送
 * 记录推送历史，便于验证
 */
@Injectable()
export class MockPushProvider implements PushProviderPort {
  private readonly logger = new Logger(MockPushProvider.name);
  private readonly history: Array<{ token: string; payload: PushPayload; timestamp: Date }> = [];

  async send(token: string, payload: PushPayload): Promise<PushResult> {
    this.logger.log(`[MOCK] Push to ${token.slice(0, 8)}...: ${payload.title}`);
    
    this.history.push({
      token,
      payload,
      timestamp: new Date(),
    });

    // 模拟成功
    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  async sendBatch(tokens: string[], payload: PushPayload): Promise<PushResult[]> {
    this.logger.log(`[MOCK] Batch push to ${tokens.length} devices: ${payload.title}`);
    
    const results: PushResult[] = [];
    for (const token of tokens) {
      const result = await this.send(token, payload);
      results.push(result);
    }
    return results;
  }

  /**
   * 获取推送历史（用于测试验证）
   */
  getHistory(): Array<{ token: string; payload: PushPayload; timestamp: Date }> {
    return [...this.history];
  }

  /**
   * 清空推送历史
   */
  clearHistory(): void {
    this.history.length = 0;
  }

  /**
   * 获取最后一次推送
   */
  getLastPush(): { token: string; payload: PushPayload; timestamp: Date } | undefined {
    return this.history[this.history.length - 1];
  }
}
