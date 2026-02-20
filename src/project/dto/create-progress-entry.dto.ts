import { IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateProgressEntryDto {
  /** Fecha del avance (YYYY-MM-DD). */
  @IsDateString()
  entryDate: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercent?: number;
}
