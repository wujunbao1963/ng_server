import { Injectable } from '@nestjs/common';

/**
 * ClockPort - 时钟抽象接口
 *
 * 用于替代代码中散落的 new Date() 调用，便于：
 * 1. 单元测试时 mock 时间
 * 2. 保证时间一致性（同一请求内使用相同时间戳）
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
   * 获取指定时间后的时间戳
   */
  after(seconds: number): Date;

  /**
   * 获取指定时间后的 ISO 字符串
   */
  isoAfter(seconds: number): string;
}

/**
 * SystemClock - 生产环境使用系统时钟
 */
@Injectable()
export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }

  isoNow(): string {
    return new Date().toISOString();
  }

  after(seconds: number): Date {
    return new Date(Date.now() + seconds * 1000);
  }

  isoAfter(seconds: number): string {
    return new Date(Date.now() + seconds * 1000).toISOString();
  }
}

/**
 * MockClock - 测试用，可固定时间
 */
export class MockClock implements ClockPort {
  private currentTime: Date;

  constructor(fixedTime?: Date | string) {
    this.currentTime = fixedTime ? new Date(fixedTime) : new Date();
  }

  now(): Date {
    return new Date(this.currentTime);
  }

  isoNow(): string {
    return this.currentTime.toISOString();
  }

  after(seconds: number): Date {
    return new Date(this.currentTime.getTime() + seconds * 1000);
  }

  isoAfter(seconds: number): string {
    return new Date(this.currentTime.getTime() + seconds * 1000).toISOString();
  }

  /**
   * 设置固定时间
   */
  setTime(time: Date | string): void {
    this.currentTime = new Date(time);
  }

  /**
   * 时间前进
   */
  advance(seconds: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + seconds * 1000);
  }
}

// Provider token for dependency injection
export const CLOCK_PORT = Symbol('CLOCK_PORT');
