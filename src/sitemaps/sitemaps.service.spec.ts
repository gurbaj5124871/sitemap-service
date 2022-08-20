import { Test, TestingModule } from '@nestjs/testing';
import { SitemapsService } from './sitemaps.service';

describe('SitemapsService', () => {
  let service: SitemapsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SitemapsService],
    }).compile();

    service = module.get<SitemapsService>(SitemapsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
