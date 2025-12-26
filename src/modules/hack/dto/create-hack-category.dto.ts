import { IsString,IsOptional } from 'class-validator';

export class CreateHackCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  imageUrl: string;
}
