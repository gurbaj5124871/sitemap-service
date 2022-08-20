import { Test, TestingModule } from '@nestjs/testing';
import { VideoSitemapsService } from './video-sitemaps.service';

describe('VideoSitemapsService', () => {
  let service: VideoSitemapsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VideoSitemapsService],
    }).compile();

    service = module.get<VideoSitemapsService>(VideoSitemapsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
