import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MaxLength(2000)
  text: string;

  @IsOptional()
  @IsString()
  @IsIn(['public', 'builders', 'only_me'])
  audience?: 'public' | 'builders' | 'only_me';

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercent?: number;
}
