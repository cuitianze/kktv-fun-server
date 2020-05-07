import { Module, HttpModule } from '@nestjs/common';
import { WechatController } from './wechat.controller';
import { WechatService } from './wechat.service';

@Module({
  imports: [HttpModule],
  controllers: [WechatController],
  providers: [WechatService],
})
export class WechatModule {}
