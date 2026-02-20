import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateProgressEntryDto } from './dto/create-progress-entry.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { ProjectService } from './project.service';

@Controller('projects')
@UseGuards(AuthGuard('jwt'))
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateProjectDto) {
    return this.projectService.create(userId, dto);
  }

  @Get()
  findAll(@CurrentUser('userId') userId: string) {
    return this.projectService.findAllByUser(userId);
  }

  @Get(':id')
  findOne(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.projectService.findOne(userId, id);
  }

  @Post(':id/progress')
  addProgress(
    @CurrentUser('userId') userId: string,
    @Param('id') projectId: string,
    @Body() dto: CreateProgressEntryDto,
  ) {
    return this.projectService.addProgress(userId, projectId, dto);
  }

  @Get(':id/progress')
  getProgress(
    @CurrentUser('userId') userId: string,
    @Param('id') projectId: string,
  ) {
    return this.projectService.getProgressEntries(userId, projectId);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser('userId') userId: string,
    @Param('id') projectId: string,
    @Body() dto: UpdateProjectStatusDto,
  ) {
    return this.projectService.updateStatus(userId, projectId, dto.status);
  }
}
