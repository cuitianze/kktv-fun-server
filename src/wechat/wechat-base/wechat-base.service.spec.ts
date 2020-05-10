import { Test, TestingModule } from '@nestjs/testing';
import { WechatBaseService } from './wechat-base.service';

describe('WechatBaseService', () => {
  let service: WechatBaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WechatBaseService],
    }).compile();

    service = module.get<WechatBaseService>(WechatBaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
