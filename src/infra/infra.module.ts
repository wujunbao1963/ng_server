import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WebPushProvider } from './ports/web-push-provider';
import { PUSH_PROVIDER_PORT } from './ports/push-provider.port';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PUSH_PROVIDER_PORT,
      useClass: WebPushProvider,
    },
    WebPushProvider,
  ],
  exports: [PUSH_PROVIDER_PORT, WebPushProvider],
})
export class InfraModule {}
