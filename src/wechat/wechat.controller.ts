import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { WechatService } from './wechat.service';

@Controller('wechat')
export class WechatController {
  constructor(private wechatService: WechatService) {}
  @Get()
  index() {
    return 'Superman';
  }

  @Get('event')
  verifySign(@Query() query) {
    return this.wechatService.verifySign(query);
  }

  @Post('event')
  async receiveEvent(@Query() query, @Body() body) {
    const signVerified = this.wechatService.verifySign(query);
    if (!signVerified) {
      return '未授权';
    }

    const resMessage = await this.wechatService.handleReceiveEvent(body);
    console.log('%c 🎬 开发日志: WechatController -> receiveEvent -> resMessage ', 'font-size:16px;background-color:#bd117e;color:white;', resMessage);

    return {};
  }
}
