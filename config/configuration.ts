export default () => ({
  wechatConfig: {
    appID: process.env.wechat_appID,
    appsecret: process.env.wechat_appsecret,
    token: process.env.wechat_token,
  },
  redisConfig: {
    url: process.env.redis_url,
  },
});

// 暴露出所有配置项名称，便于引用提示
export enum CONFIGURATION {
  wechatConfig = 'wechatConfig',
  redisConfig = 'redisConfig',
}
