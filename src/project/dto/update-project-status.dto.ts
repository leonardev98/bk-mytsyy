import { IsIn } from 'class-validator';

export class UpdateProjectStatusDto {
  @IsIn(['draft', 'active', 'paused', 'completed'])
  status: 'draft' | 'active' | 'paused' | 'completed';
}
