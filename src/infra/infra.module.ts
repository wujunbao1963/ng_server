import { Global, Module } from '@nestjs/common';
import { CLOCK_PORT, SystemClock, PUSH_PROVIDER_PORT, MockPushProvider } from './ports';

/**
 * InfraModule - 基础设施模块
 * 
 * 提供全局可用的基础设施服务：
 * - ClockPort: 时间抽象
 * - PushProviderPort: 推送服务抽象
 * 
 * 使用 @Global() 使其在所有模块中可用
 */
@Global()
@Module({
  providers: [
    {
      provide: CLOCK_PORT,
      useClass: SystemClock,
    },
    {
      provide: PUSH_PROVIDER_PORT,
      useClass: MockPushProvider, // TODO: 生产环境替换为 FCMPushProvider
    },
  ],
  exports: [CLOCK_PORT, PUSH_PROVIDER_PORT],
})
export class InfraModule {}
