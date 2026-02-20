import { IsArray, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RoadmapWeekDto {
  @IsNumber()
  week: number;

  @IsArray()
  @IsString({ each: true })
  goals: string[];

  @IsArray()
  @IsString({ each: true })
  actions: string[];
}

export class CreateProjectDto {
  @IsString()
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** 'chat' cuando viene de elegir una propuesta; 'document' cuando viene de PDF/Word/TXT. */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  pitch?: string;

  @IsOptional()
  @IsString()
  whyItWins?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  introMessage?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoadmapWeekDto)
  roadmapWeeks: RoadmapWeekDto[];
}
