import { ApiProperty } from '@nestjs/swagger';
import * as Joiful from 'joiful';

export class ServeSitemap {
  @ApiProperty()
  @Joiful.string().required()
  sitemap: string;
}
