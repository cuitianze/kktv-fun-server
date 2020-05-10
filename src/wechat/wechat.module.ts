import { Module, HttpModule } from '@nestjs/common';
import { WechatController } from './wechat.controller';
import { WechatService } from './wechat.service';
import { WechatBaseService } from './wechat-base/wechat-base.service';

@Module({
  imports: [HttpModule],
  controllers: [WechatController],
  providers: [WechatService, WechatBaseService],
})
export class WechatModule {}
