import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Roadmap } from './roadmap.entity';

@Entity('roadmap_weeks')
export class RoadmapWeek {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'roadmap_id', type: 'uuid' })
  roadmapId: string;

  @Column({ name: 'week_number', type: 'smallint' })
  weekNumber: number;

  @Column({ type: 'jsonb', default: [] })
  goals: string[];

  @Column({ type: 'jsonb', default: [] })
  actions: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Roadmap, (r) => r.weeks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roadmap_id' })
  roadmap: Roadmap;
}
