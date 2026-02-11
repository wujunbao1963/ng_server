import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WebPushProvider } from './ports/web-push-provider';
import { APNsPushProvider } from './ports/apns-push-provider';
import { MultiPushProvider } from './ports/multi-push-provider';
import { PUSH_PROVIDER_PORT } from './ports/push-provider.port';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    WebPushProvider,
    APNsPushProvider,
    {
      provide: PUSH_PROVIDER_PORT,
      useFactory: (webPush: WebPushProvider, apns: APNsPushProvider) => {
        return new MultiPushProvider(webPush, apns);
      },
      inject: [WebPushProvider, APNsPushProvider],
    },
  ],
  exports: [PUSH_PROVIDER_PORT, WebPushProvider, APNsPushProvider],
})
export class InfraModule {}
