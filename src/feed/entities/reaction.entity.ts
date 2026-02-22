import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('feed_reactions')
export class Reaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'post_id', type: 'uuid' })
  postId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
