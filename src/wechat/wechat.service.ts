import { Injectable, HttpService } from '@nestjs/common';
import * as crypto from 'crypto';
import { fmtNormalXML } from 'src/utils/fmtNormalXML';
import { generateMsgXmlTemplate } from 'src/utils/generateMsgXmlTemplate';
import { createTimestamp } from 'src/utils/createTimestamp';
import WechatApiService from 'src/utils/wechatApiService';

const TOKEN = 'kktv_fun_51huo';

const wechatServiceApiInstance = new WechatApiService({});

const SHA1 = (str: string) => {
  return crypto
    .createHash('sha1')
    .update(str.toString())
    .digest('hex');
};

@Injectable()
export class WechatService {
  constructor(private httpService: HttpService) {}

  // 验证微信签名
  verifySign(query: {
    signature: any;
    nonce: any;
    timestamp: any;
    echostr: any;
  }): boolean | string {
    const token = TOKEN;
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
    /* MsgType 为 text时
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
    /* MsgType 为 event时
    {
      xml: {
        ToUserName: [ 'gh_4e4caf62ccfe' ],
        FromUserName: [ 'o2wqAs_t5JpM7P6-qmXSr_DEjtqs' ],
        CreateTime: [ '1588868068' ],
        MsgType: [ 'event' ],
        Event: [ 'unsubscribe' ],
        EventKey: [ '' ]
      }
    }
    */

    // 重点要看是怎么处理xml的
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
      if (!!eventKey) {
        const user = await wechatServiceApiInstance.handle(
          'getUserInfo',
          userId,
        );
        const userInfo = `${user.nickname}（${user.sex ? '男' : '女'}, ${
          user.province
        }${user.city}）`;
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
        // await redis.pipeline()
        //             .hset(eventKey, 'unionID', user.unionid || '') // 仅unionid机制下有效
        //             .hset(eventKey, 'openID', user.openid)
        //             .exec()
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

  async createQRCode() {
    const id = createTimestamp();
  }
}
