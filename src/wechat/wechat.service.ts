import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

const TOKEN = 'kktv_fun_51huo';

const SHA1 = (str: string) => {
  return crypto
    .createHash('sha1')
    .update(str.toString())
    .digest('hex');
};

@Injectable()
export class WechatService {
  verifySign(query: { signature: any; nonce: any; timestamp: any; echostr: any; }) {
    const token = TOKEN;
    const { signature, nonce, timestamp, echostr } = query;
    const str = [token, timestamp, nonce].sort().join('');
    const signVerified = SHA1(str) === signature;
    if (signVerified) {
      return echostr;
    } else {
      return false;
    }
  }
}
