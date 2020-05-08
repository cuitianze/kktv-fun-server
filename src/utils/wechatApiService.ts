import got from 'got';

const wxGot = got.extend({
  prefixUrl: 'https://api.weixin.qq.com/cgi-bin/',
  responseType: 'json',
  hooks: {
    afterResponse: [(res: any) => (res.statusCode === 200 ? res.body : null)],
  },
});

// 微信api接口集合
const api = {
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

class WechatApiService {
  [x: string]: any;
  constructor(opts: {
    appID: any;
    appSecret: any;
    getAccessToken: any;
    saveAccessToken: any;
    getTicket: any;
    saveTicket: any;
  }) {
    this.opts = Object.assign({}, opts);
    this.appID = opts.appID;
    this.appSecret = opts.appSecret;
    this.getAccessToken = opts.getAccessToken;
    this.saveAccessToken = opts.saveAccessToken;
    this.getTicket = opts.getTicket;
    this.saveTicket = opts.saveTicket;

    this.fetchAccessToken();
  }

  async fetchAccessToken() {
    let token = await this.getAccessToken();

    if (!token) {
      token = await this.updateAccessToken();
      await this.saveAccessToken(token);
      token = token.access_token;
    }
    return token;
  }

  async updateAccessToken() {
    const url =
      api.accessToken + '&appid=' + this.appID + '&secret=' + this.appSecret;
    return await wxGot(url);
  }

  async handle(operation: string | number, ...args: any[]) {
    const token = await this.fetchAccessToken();
    if (!token) return {};

    const options = this[operation](token, ...args);
    const res = await wxGot(options);

    return res;
  }

  // 获取用户基本信息
  getUserInfo(token: string, openID: string, lang: string) {
    const url = `${
      api.user.info
    }access_token=${token}&openid=${openID}&lang=${lang || 'zh_CN'}`;

    return { url: url };
  }

  // 生成带参数二维码的接口
  getQRCodeTicket(token: string, sceneStr: string, timeout: number) {
    return {
      url: `${api.QRCodeTicket}access_token=${token}`,
      method: 'post',
      body: {
        expire_seconds: timeout || 60,
        action_name: 'QR_STR_SCENE', // 临时二维码
        action_info: {
          scene: {
            scene_str: sceneStr,
          },
        },
      },
    };
  }
}

export default WechatApiService;
