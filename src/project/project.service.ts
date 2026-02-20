import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProgressEntry } from './entities/progress-entry.entity';
import { Project } from './entities/project.entity';
import { Roadmap } from './entities/roadmap.entity';
import { RoadmapWeek } from './entities/roadmap-week.entity';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { CreateProgressEntryDto } from './dto/create-progress-entry.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Roadmap)
    private readonly roadmapRepo: Repository<Roadmap>,
    @InjectRepository(RoadmapWeek)
    private readonly roadmapWeekRepo: Repository<RoadmapWeek>,
    @InjectRepository(ProgressEntry)
    private readonly progressEntryRepo: Repository<ProgressEntry>,
  ) {}

  async create(userId: string, dto: CreateProjectDto): Promise<Project> {
    const project = this.projectRepo.create({
      userId,
      title: dto.title,
      description: dto.description ?? null,
      source: dto.source ?? 'chat',
      pitch: dto.pitch ?? null,
      whyItWins: dto.whyItWins ?? null,
      introMessage: dto.introMessage ?? null,
      status: 'active',
    });
    const savedProject = await this.projectRepo.save(project);

    const roadmap = this.roadmapRepo.create({ projectId: savedProject.id });
    const savedRoadmap = await this.roadmapRepo.save(roadmap);

    const weeks = (dto.roadmapWeeks ?? [])
      .filter((w) => w.week >= 1 && w.week <= 4)
      .sort((a, b) => a.week - b.week)
      .slice(0, 4)
      .map((w) =>
        this.roadmapWeekRepo.create({
          roadmapId: savedRoadmap.id,
          weekNumber: w.week,
          goals: Array.isArray(w.goals) ? w.goals : [],
          actions: Array.isArray(w.actions) ? w.actions : [],
        }),
      );
    await this.roadmapWeekRepo.save(weeks);

    return this.findOne(userId, savedProject.id);
  }

  async findAllByUser(userId: string): Promise<Project[]> {
    const projects = await this.projectRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      relations: { roadmap: { weeks: true } },
    });
    const lastProgress = await this.getLastProgressByProjectIds(
      projects.map((p) => p.id),
    );
    return projects.map((p) => {
      const last = lastProgress.get(p.id);
      const withProgress = {
        ...p,
        lastProgress: last
          ? {
              entryDate: last.entryDate,
              content: last.content,
              progressPercent: last.progressPercent,
              createdAt: last.createdAt,
            }
          : null,
      };
      return withProgress as Project & { lastProgress: unknown };
    });
  }

  async findOne(userId: string, projectId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: { roadmap: { weeks: true } },
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    if (project.userId !== userId) throw new ForbiddenException('No tienes acceso a este proyecto');
    return project;
  }

  async addProgress(
    userId: string,
    projectId: string,
    dto: CreateProgressEntryDto,
  ): Promise<ProgressEntry> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    if (project.userId !== userId) throw new ForbiddenException('No tienes acceso a este proyecto');

    const entry = this.progressEntryRepo.create({
      projectId,
      entryDate: new Date(dto.entryDate),
      content: dto.content ?? null,
      progressPercent: dto.progressPercent ?? null,
    });
    return this.progressEntryRepo.save(entry);
  }

  async getProgressEntries(userId: string, projectId: string): Promise<ProgressEntry[]> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    if (project.userId !== userId) throw new ForbiddenException('No tienes acceso a este proyecto');

    return this.progressEntryRepo.find({
      where: { projectId },
      order: { entryDate: 'DESC', createdAt: 'DESC' },
      take: 100,
    });
  }

  async updateStatus(
    userId: string,
    projectId: string,
    status: 'draft' | 'active' | 'paused' | 'completed',
  ): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    if (project.userId !== userId) throw new ForbiddenException('No tienes acceso a este proyecto');
    project.status = status;
    await this.projectRepo.save(project);
    return this.findOne(userId, projectId);
  }

  private async getLastProgressByProjectIds(
    projectIds: string[],
  ): Promise<Map<string, ProgressEntry>> {
    if (projectIds.length === 0) return new Map();
    const entries = await this.progressEntryRepo.find({
      where: { projectId: In(projectIds) },
      order: { entryDate: 'DESC', createdAt: 'DESC' },
    });
    const byProjectId = new Map<string, ProgressEntry>();
    for (const e of entries) {
      if (!byProjectId.has(e.projectId)) byProjectId.set(e.projectId, e);
    }
    return byProjectId;
  }
}
