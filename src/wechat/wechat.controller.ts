import { Controller, Get, Query } from '@nestjs/common';
import { WechatService } from './wechat.service';

@Controller('wechat')
export class WechatController {
  constructor(private wechatService: WechatService) {}
  @Get()
  index() {
    return 'Superman';
  }

  @Get('verifySign')
  verifySign(@Query() query) {
    return this.wechatService.verifySign(query);
  }
}
