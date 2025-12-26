import { IsOptional, IsString } from 'class-validator';

export class createHackDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  youtubeVideoUrl: string;

  @IsString()
  content: string;

  @IsString()
  categoryId: string;
}
