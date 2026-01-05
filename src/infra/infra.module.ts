import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WebPushProvider } from './ports/web-push-provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'PushProvider',
      useClass: WebPushProvider,
    },
    WebPushProvider,
  ],
  exports: ['PushProvider', WebPushProvider],
})
export class InfraModule {}
