import { Test, TestingModule } from '@nestjs/testing';
import { SitemapsIndexService } from './sitemaps-index.service';

describe('SitemapsIndexService', () => {
  let service: SitemapsIndexService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SitemapsIndexService],
    }).compile();

    service = module.get<SitemapsIndexService>(SitemapsIndexService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
