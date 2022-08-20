import { Test, TestingModule } from '@nestjs/testing';
import { SitemapsController } from './sitemaps.controller';

describe('SitemapsController', () => {
  let controller: SitemapsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SitemapsController],
    }).compile();

    controller = module.get<SitemapsController>(SitemapsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
