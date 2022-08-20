import { Test, TestingModule } from '@nestjs/testing';
import { VideoSitemapsProcessorService } from './video-sitemaps.processor.service';

describe('VideoSitemapsProcessorService', () => {
  let service: VideoSitemapsProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VideoSitemapsProcessorService],
    }).compile();

    service = module.get<VideoSitemapsProcessorService>(
      VideoSitemapsProcessorService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
