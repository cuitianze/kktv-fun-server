import { Injectable, HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { RedisService } from 'nestjs-redis';

import { fmtNormalXML } from 'src/utils/fmtNormalXML';
import { generateMsgXmlTemplate } from 'src/utils/generateMsgXmlTemplate';
import { createTimestamp } from 'src/utils/createTimestamp';
import { WechatBaseService } from './wechat-base/wechat-base.service';
import { CONFIGURATION } from 'config/configuration';

const SHA1 = (str: string) => {
  return crypto
    .createHash('sha1')
    .update(str.toString())
    .digest('hex');
};

@Injectable()
export class WechatService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private wechatBaseService: WechatBaseService,
    private readonly redisService: RedisService,
  ) {
    this.init();
  }

  redis = null;

  async init() {
    this.redis = await this.redisService.getClient();
  }

  // 验证微信签名
  verifySign(query: {
    signature: any;
    nonce: any;
    timestamp: any;
    echostr: any;
  }): boolean | string {
    /**
     * https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1421135319
     * 1）将token、timestamp、nonce三个参数进行字典序排序
     * 2）将三个参数字符串拼接成一个字符串进行sha1加密
     * 3）开发者获得加密后的字符串可与signature对比，标识该请求来源于微信
     */
    const token = this.configService.get(CONFIGURATION.wechatConfig).token;
    const { signature, nonce, timestamp, echostr } = query;

    const str = [token, timestamp, nonce].sort().join('');
    const signVerified = SHA1(str) === signature;
    if (signVerified) {
      return echostr || true;
    } else {
      return false;
    }
  }

  // 处理微信消息事件
  async handleReceiveEvent(body) {
    // 推送事件类型可以参考[这里](https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1421140454)
    /* MsgType 为 text时
    {
      xml: {
        ToUserName: [ 'gh_4e4caf62ccfe' ],
        FromUserName: [ 'o2wqAs_t5JpM7P6' ],
        CreateTime: [ '1588863231' ],
        MsgType: [ 'text' ],
        Content: [ '123' ],
        MsgId: [ '22747052375433386' ]
      }
    }
    */
    /* MsgType 为 event时
    {
      xml: {
        ToUserName: [ 'gh_4e4caf62ccfe' ], // 开发者微信号
        FromUserName: [ 'o2wqAs_t5JpM7P6' ], // 发送方帐号（一个OpenID）
        CreateTime: [ '1588868068' ], // 消息创建时间 （整型）
        MsgType: [ 'event' ], // 消息类型，event
        Event: [ 'unsubscribe' ], // 事件类型，subscribe(订阅)、unsubscribe(取消订阅)
        EventKey: [ '' ] // 事件KEY值，qrscene_为前缀，后面为二维码的参数值
      }
    }
    */

    // 把数组形态的xmlObject转换可读性更高的结构
    const message = fmtNormalXML(body.xml);

    const {
      MsgType: msgType,
      Event: msgEvent,
      FromUserName: userId,
    }: any = message;
    let { EventKey: eventKey }: any = message;

    let resMessage: string; // 响应消息

    if (msgType === 'event') {
      switch (msgEvent) {
        // 关注
        case 'subscribe':
          resMessage = '感谢您的关注';
          break;
        // 取消关注
        case 'unsubscribe':
          // 用户取消关注后我们不能再通过微信的接口拿到用户信息，
          // 如果要记录用户信息，需要从我们自己的用户记录里获取该信息。
          // 所以建议创建用户时除了unionid，最好把openid也保存起来。
          console.log(userId + '取消关注了!');
          break;
        // 关注后扫码
        case 'SCAN':
          resMessage = '扫码成功';
          break;
      }

      // 如果有场景值，那就是扫了生成的二维码
      if (eventKey) {
        const user: any = await this.wechatBaseService.getUserInfo(userId);
        const userInfo = `${user.nickname}（${user.sex ? '男' : '女'}, ${
          user.province
        }${user.city}）`;
        // eventKey 是这样的格式 1589099577 OR qrscene_1589099577
        if (eventKey.slice(0, 8) === 'qrscene_') {
          // 扫码并关注
          // 关注就创建帐号的话可以在这里把用户信息写入数据库完成用户注册
          eventKey = eventKey.slice(8);
          console.log(userInfo + '扫码并关注了公众号');
        } else {
          // 已关注
          console.log(userInfo + '扫码进入了公众号');
        }

        // 更新扫码记录，供浏览器扫码状态轮询
        await this.redis
          .pipeline()
          .hset(eventKey, 'unionID', user.unionid || '') // 仅unionid机制下有效
          .hset(eventKey, 'openID', user.openid)
          .exec();
      }
    }

    // 在公众号内发消息
    if (msgType === 'text') {
      const { Content: content }: any = message;
      if (/^夸/.test(content)) {
        const kuaRes = await this.httpService
          .get('https://chp.shadiao.app/api.php')
          .toPromise();
        resMessage = `${kuaRes.data}`;
      } else {
        const res = await this.httpService
          .get(
            `http://api.qingyunke.com/api.php?key=free&appid=0&msg=${encodeURIComponent(
              content,
            )}`,
          )
          .toPromise();
        const reply = res.data.content
          .replace(/{br}/g, '\n')
          .replace('菲菲', '小天');
        resMessage = `${reply}`;
      }
    }

    return generateMsgXmlTemplate(resMessage, message);
  }

  // 生成二维码图片
  async createQRCode(type: string) {
    let errno = 0;
    let responseData = {};
    const qrCodeTimeId = createTimestamp();
    const qrCodeTicketRes: {
      ticket: string;
      expire_seconds: number;
      url: string;
    } = await this.wechatBaseService.getQRCodeTicket(qrCodeTimeId);
    /* 
    { qrCodeTicketRes
      ticket: 'gQGa8DwAAAAAAAAAAS5odHRwOi8vd2VpeGluLnFxLmNvbS9xLzAyV1BVMGMzcmFhMFAxRS1WVHh1Y3AAAgQCubdeAwQ8AAAA',
      expire_seconds: 60,
      url: 'http://weixin.qq.com/q/02WPU0c3raa0P1E-VTxucp' 
    }
    */
    if (qrCodeTicketRes === null) {
      errno = 1;
    } else {
      responseData = {
        expiresIn: qrCodeTicketRes.expire_seconds,
        id: qrCodeTimeId,
      };

      const qrCodeBase64Url = await QRCode.toDataURL(qrCodeTicketRes.url);

      responseData = {
        ...responseData,
        qrCodeImgSrc: qrCodeBase64Url,
      };

      /*
      客户端轮训
      async function waitToSubscribe(id, timeout) {
        let countdown = Math.ceil(timeout / 3);
        return new Promise((resolve, reject) => {
          const loop = async function() {
            let res = await ky.default
              .get('/wechat/check', {
                searchParams: { id },
                headers: { Accept: 'application/json' },
              })
              .json();
            if (!res) return;
            if (res.errno === 0) resolve('subscribe');
            else if (res.errno === 2) reject('timeout');
            else if (countdown-- > 0) self.QRCodeTimer = setTimeout(loop, 3000);
          };
          loop();
        });
      }
      (async () => {
        try {
          await waitToSubscribe(id, timeout);
          window.location.href = '/wechat/';
        } catch (e) {
          history.go(0);
        }
      })();
      */

      if (type) {
        return `<img src="${qrCodeBase64Url}" />`;
      } else {
        return {
          errno,
          data: responseData,
        };
      }
    }
  }
}
