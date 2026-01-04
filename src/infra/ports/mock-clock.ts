import { Injectable } from '@nestjs/common';
import { ClockPort } from './clock.port';

/**
 * MockClock - 测试用的时钟实现
 * 
 * 可以手动设置时间，适用于单元测试
 * 
 * 使用示例：
 * ```typescript
 * const mockClock = new MockClock();
 * mockClock.setTime(new Date('2025-01-01T00:00:00Z'));
 * expect(mockClock.isoNow()).toBe('2025-01-01T00:00:00.000Z');
 * 
 * mockClock.advance(1000); // 前进 1 秒
 * expect(mockClock.timestamp()).toBe(new Date('2025-01-01T00:00:01Z').getTime());
 * ```
 */
@Injectable()
export class MockClock implements ClockPort {
  private currentTime: Date;

  constructor(initialTime?: Date) {
    this.currentTime = initialTime ?? new Date();
  }

  now(): Date {
    return new Date(this.currentTime);
  }

  isoNow(): string {
    return this.currentTime.toISOString();
  }

  timestamp(): number {
    return this.currentTime.getTime();
  }

  /**
   * 设置当前时间
   */
  setTime(time: Date): void {
    this.currentTime = new Date(time);
  }

  /**
   * 前进指定毫秒数
   */
  advance(milliseconds: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + milliseconds);
  }

  /**
   * 重置为当前系统时间
   */
  reset(): void {
    this.currentTime = new Date();
  }
}
