import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProgressEntry } from './progress-entry.entity';
import { Roadmap } from './roadmap.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, default: 'chat' })
  source: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pitch: string | null;

  @Column({ name: 'why_it_wins', type: 'text', nullable: true })
  whyItWins: string | null;

  @Column({ name: 'intro_message', type: 'varchar', length: 1000, nullable: true })
  introMessage: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Roadmap, (r) => r.project)
  roadmap: Roadmap | null;

  @OneToMany(() => ProgressEntry, (e) => e.project)
  progressEntries: ProgressEntry[];
}
