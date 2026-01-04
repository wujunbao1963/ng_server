/**
 * ClockPort - 时间抽象接口
 * 
 * 用途：
 * 1. 使时间相关代码可测试（可注入 MockClock）
 * 2. 统一时间格式（ISO 字符串）
 * 3. 支持时区处理（未来扩展）
 */
export interface ClockPort {
  /**
   * 获取当前时间
   */
  now(): Date;

  /**
   * 获取当前时间的 ISO 字符串
   */
  isoNow(): string;

  /**
   * 获取当前时间的毫秒时间戳
   */
  timestamp(): number;
}

/**
 * ClockPort 的依赖注入 token
 */
export const CLOCK_PORT = Symbol('CLOCK_PORT');
