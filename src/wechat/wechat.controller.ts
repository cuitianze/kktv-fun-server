import { Controller, Get, Query, Post, Body, Header } from '@nestjs/common';
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
  @Header('content-type', 'application/xml')
  async receiveEvent(@Query() query, @Body() body) {
    /* body 的数据结构如下
    {
      xml: {
        ToUserName: [ 'gh_4e4caf62ccfe' ],
        FromUserName: [ 'o2wqAs_t5JpM7P6-qmXSr_DEjtqs' ],
        CreateTime: [ '1588863231' ],
        MsgType: [ 'text' ],
        Content: [ '123' ],
        MsgId: [ '22747052375433386' ]
      }
    }
    */
    const signVerified = this.wechatService.verifySign(query);
    if (!signVerified) {
      return '未授权';
    }

    const resMessage = await this.wechatService.handleReceiveEvent(body);
    /* resMessage 响应给微信的消息
      <xml>
        <ToUserName><![CDATA[o2wqAs_t5JpM7P6-qmXSr_DEjtqs]]></ToUserName>
        <FromUserName><![CDATA[gh_4e4caf62ccfe]]></FromUserName>
        <CreateTime>1588871222</CreateTime>
        <MsgType><![CDATA[text]]></MsgType>
        <Content><![CDATA[我也是]]></Content>
      </xml>
    */

    return resMessage;
  }

  @Get('qrcode')
  getWechatORCode(
    @Query('userID') userId: string,
    @Query('type') type: string,
  ) {
    const errno = 0;
  }
}
