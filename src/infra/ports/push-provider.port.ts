/**
 * PushProviderPort - 推送服务抽象接口
 * 
 * 用途：
 * 1. 抽象推送实现（FCM、APNs、Mock）
 * 2. 支持多平台推送
 * 3. 统一推送结果处理
 */

export interface PushPayload {
  /** 通知标题 */
  title: string;
  /** 通知正文 */
  body: string;
  /** 自定义数据 */
  data?: Record<string, string>;
  /** 声音（可选） */
  sound?: string;
  /** 角标数量（可选） */
  badge?: number;
}

export interface PushResult {
  /** 是否发送成功 */
  success: boolean;
  /** 消息 ID（如果成功） */
  messageId?: string;
  /** 错误信息（如果失败） */
  error?: string;
  /** 错误代码（如果失败） */
  errorCode?: string;
  /** 是否应该移除该 token（token 无效） */
  shouldRemoveToken?: boolean;
}

export interface PushProviderPort {
  /**
   * 发送推送通知
   * 
   * @param token 设备推送 token
   * @param payload 推送内容
   * @returns 推送结果
   */
  send(token: string, payload: PushPayload): Promise<PushResult>;

  /**
   * 批量发送推送通知
   * 
   * @param tokens 设备推送 token 列表
   * @param payload 推送内容
   * @returns 推送结果列表（与 tokens 顺序对应）
   */
  sendBatch(tokens: string[], payload: PushPayload): Promise<PushResult[]>;
}

/**
 * PushProviderPort 的依赖注入 token
 */
export const PUSH_PROVIDER_PORT = Symbol('PUSH_PROVIDER_PORT');
