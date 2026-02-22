import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('feed_posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 2000 })
  text: string;

  @Column({ type: 'varchar', length: 20, default: 'public' })
  audience: string;

  @Column({ name: 'current_day', type: 'smallint', default: 0 })
  currentDay: number;

  @Column({ name: 'total_days', type: 'smallint', default: 30 })
  totalDays: number;

  @Column({ name: 'progress_percent', type: 'smallint', default: 0 })
  progressPercent: number;

  @Column({ name: 'evidence_image_url', type: 'varchar', length: 500, nullable: true })
  evidenceImageUrl: string | null;

  @Column({ name: 'evidence_link', type: 'varchar', length: 500, nullable: true })
  evidenceLink: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
