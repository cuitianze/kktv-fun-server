import { Module, CacheModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from 'nestjs-redis';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WechatModule } from './wechat/wechat.module';
import configuration, { CONFIGURATION } from 'config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    CacheModule.register(),
    RedisModule.forRootAsync({
      useFactory: async (configService: ConfigService) =>
        configService.get(CONFIGURATION.redisConfig),
      inject: [ConfigService],
    }),
    WechatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
