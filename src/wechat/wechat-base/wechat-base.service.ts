import { Injectable, HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'nestjs-redis';

import { CONFIGURATION } from 'config/configuration';

// 微信API URL前缀
const prefixUrl = 'https://api.weixin.qq.com/cgi-bin/';

// 微信api接口集合
const wechatApi = {
  // https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/Get_access_token.html
  accessToken: 'token?grant_type=client_credential', // 获取Access token
  user: {
    // https://developers.weixin.qq.com/doc/offiaccount/User_Management/Get_users_basic_information_UnionID.html#UinonId
    info: 'user/info?', // 获取用户基本信息(UnionID机制)
  },
  // https://developers.weixin.qq.com/doc/offiaccount/Account_Management/Generating_a_Parametric_QR_Code.html
  QRCodeTicket: 'qrcode/create?', // 创建二维码ticket
  QRCode: 'showqrcode?', // 通过ticket换取二维码
};

@Injectable()
export class WechatBaseService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.init();
  }

  appID = null;
  appsecret = null;
  redis = null;

  async init() {
    const wechatConfig = this.configService.get(CONFIGURATION.wechatConfig);
    this.appID = wechatConfig.appID;
    this.appsecret = wechatConfig.appsecret;
    this.redis = await this.redisService.getClient();
    this.fetchAccessToken();
  }

  // 从Redis里取token信息
  async getAccessToken() {
    const token = await this.redis.get('access_token');
    return token;
  }

  // 向Redis里存token信息
  async saveAccessToken(
    data: { access_token?: string; expires_in?: number } = {},
  ) {
    // 配合Redis可以设置微信Token的过期时间
    await this.redis.set(
      'access_token',
      data.access_token,
      'EX',
      data.expires_in,
    );
  }

  // 获取access_token
  async fetchAccessToken() {
    let token: any = await this.getAccessToken();
    if (!token) {
      token = await this.updateAccessToken();
      if (Object.keys(token).length) {
        await this.saveAccessToken(token);
      }
      token = token.access_token;
    }
    return token;
  }

  // 刷新access_token
  async updateAccessToken() {
    const url = `${prefixUrl}${wechatApi.accessToken}&appid=${this.appID}&secret=${this.appsecret}`;
    const res: any = await this.httpService.get(url).toPromise();
    if (res.status === 200) {
      return res.data;
    } else {
      return {};
    }
  }

  // 获取用户基本信息
  async getUserInfo(openID: string, lang?: string) {
    const token = await this.fetchAccessToken();
    if (!token) return {};
    const url = `${prefixUrl}${
      wechatApi.user.info
    }access_token=${token}&openid=${openID}&lang=${lang || 'zh_CN'}`;
    const res: any = await this.httpService.get(url).toPromise();
    if (res.status === 200) {
      return res.data;
    } else {
      return {};
    }
  }

  // 申请二维码Ticket
  // 生成带参数二维码
  async getQRCodeTicket(sceneStr: string, timeout?: number) {
    const token = await this.fetchAccessToken();
    if (!token) return {};
    const url = `${prefixUrl}${wechatApi.QRCodeTicket}access_token=${token}`;
    const res: any = await this.httpService
      .post(url, {
        expire_seconds: timeout || 60,
        action_name: 'QR_STR_SCENE', // 临时二维码
        action_info: {
          scene: {
            scene_str: sceneStr,
          },
        },
      })
      .toPromise();
    if (res.status === 200) {
      return res.data;
    } else {
      return {};
    }
  }
}
