import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebPushProvider } from './ports/web-push-provider';
import { ApnsPushProvider } from './ports/apns-push-provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    WebPushProvider,
    ApnsPushProvider,
  ],
  exports: [WebPushProvider, ApnsPushProvider],
})
export class InfraModule {}
