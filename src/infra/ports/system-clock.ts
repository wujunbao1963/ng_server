import { Injectable } from '@nestjs/common';
import { ClockPort } from './clock.port';

/**
 * SystemClock - 生产环境的时钟实现
 * 
 * 使用系统时间，适用于生产环境
 */
@Injectable()
export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }

  isoNow(): string {
    return new Date().toISOString();
  }

  timestamp(): number {
    return Date.now();
  }
}
