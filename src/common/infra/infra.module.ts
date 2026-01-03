import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SystemClock, CLOCK_PORT } from './clock.port';
import { NgLoggerService } from './logger.service';
import { RequestIdInterceptor } from './request-id.interceptor';
import { MockPushProvider, FCMPushProvider, PUSH_PROVIDER_PORT } from './push-provider.port';

/**
 * InfraModule - 基础设施模块
 *
 * 提供全局可用的基础设施服务：
 * - ClockPort: 时钟抽象
 * - NgLoggerService: 统一日志
 * - PushProviderPort: 推送服务抽象
 * - RequestIdInterceptor: 请求追踪
 *
 * 标记为 @Global() 使其在所有模块中自动可用
 */
@Global()
@Module({
  providers: [
    // Clock: 使用 SystemClock 作为默认实现
    {
      provide: CLOCK_PORT,
      useClass: SystemClock,
    },

    // Logger: 每个注入点获得新实例
    NgLoggerService,

    // Push Provider: 根据环境变量选择实现
    {
      provide: PUSH_PROVIDER_PORT,
      useFactory: (config: ConfigService, logger: NgLoggerService) => {
        const mode = config.get<string>('PUSH_PROVIDER_MODE') ?? 'mock';
        if (mode === 'fcm') {
          return new FCMPushProvider(logger);
        }
        return new MockPushProvider(logger);
      },
      inject: [ConfigService, NgLoggerService],
    },

    // Request ID Interceptor: 全局注册
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestIdInterceptor,
    },
  ],
  exports: [CLOCK_PORT, NgLoggerService, PUSH_PROVIDER_PORT],
})
export class InfraModule {}
