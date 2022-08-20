import { Test, TestingModule } from '@nestjs/testing';
import { TextSitemapsService } from './text-sitemaps.service';

describe('TextSitemapsService', () => {
  let service: TextSitemapsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TextSitemapsService],
    }).compile();

    service = module.get<TextSitemapsService>(TextSitemapsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
