import { Test, TestingModule } from '@nestjs/testing';
import { TextSitemapsProcessorService } from './text-sitemaps.processor.service';

describe('TextSitemapsProcessorService', () => {
  let service: TextSitemapsProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TextSitemapsProcessorService],
    }).compile();

    service = module.get<TextSitemapsProcessorService>(
      TextSitemapsProcessorService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
