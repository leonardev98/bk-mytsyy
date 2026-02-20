import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgressEntry } from './entities/progress-entry.entity';
import { Project } from './entities/project.entity';
import { Roadmap } from './entities/roadmap.entity';
import { RoadmapWeek } from './entities/roadmap-week.entity';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Roadmap, RoadmapWeek, ProgressEntry]),
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
