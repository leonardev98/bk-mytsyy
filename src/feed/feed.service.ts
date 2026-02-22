import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { Post } from './entities/post.entity';
import { Reaction } from './entities/reaction.entity';

export interface FeedPostResponse {
  id: string;
  authorName: string;
  authorUsername?: string | null;
  authorAvatar?: string | null;
  time: string;
  createdAt: string;
  text: string;
  currentDay: number;
  totalDays?: number;
  progressPercent?: number;
  evidenceImageUrl?: string | null;
  evidenceLink?: string | null;
  reactionCount: number;
  hasReacted?: boolean;
}

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(Reaction)
    private readonly reactionRepo: Repository<Reaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(userId: string, dto: CreatePostDto): Promise<FeedPostResponse> {
    const post = this.postRepo.create({
      userId,
      text: dto.text,
      audience: dto.audience ?? 'public',
      currentDay: dto.currentDay ?? 0,
      totalDays: dto.totalDays ?? 30,
      progressPercent: dto.progressPercent ?? 0,
    });
    const saved = await this.postRepo.save(post);
    return this.toFeedPost(saved, null, 0, false);
  }

  private async loadAuthorForPost(post: Post): Promise<User | null> {
    const u = await this.userRepo.findOne({
      where: { id: post.userId },
      select: ['id', 'name'],
    });
    return u ?? null;
  }

  async findAll(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ posts: FeedPostResponse[]; page: number; limit: number; total: number }> {
    const cappedLimit = Math.min(Math.max(1, limit), 50);
    const skip = (Math.max(1, page) - 1) * cappedLimit;

    const qb = this.postRepo
      .createQueryBuilder('post')
      .where('post.audience = :public', { public: 'public' })
      .orWhere('post.audience = :builders', { builders: 'builders' })
      .orWhere('(post.audience = :onlyMe AND post.userId = :userId)', {
        onlyMe: 'only_me',
        userId,
      })
      .orderBy('post.createdAt', 'DESC');

    const [posts, total] = await qb.skip(skip).take(cappedLimit).getManyAndCount();

    if (posts.length === 0) {
      return { posts: [], page: Math.max(1, page), limit: cappedLimit, total: 0 };
    }

    const authorIds = [...new Set(posts.map((p) => p.userId))];
    const users = await this.userRepo.find({
      where: authorIds.map((id) => ({ id })),
      select: ['id', 'name'],
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const postIds = posts.map((p) => p.id);
    const reactionCounts = await this.reactionRepo
      .createQueryBuilder('r')
      .select('r.postId', 'postId')
      .addSelect('COUNT(*)', 'count')
      .where('r.postId IN (:...ids)', { ids: postIds })
      .groupBy('r.postId')
      .getRawMany<{ postId: string; count: string }>();

    const userReactions = await this.reactionRepo.find({
      where: { postId: In(postIds), userId },
      select: ['postId'],
    });
    const reactedPostIds = new Set(userReactions.map((r) => r.postId));
    const countByPostId = new Map(
      reactionCounts.map((r) => [r.postId, parseInt(r.count, 10)]),
    );

    const feedPosts: FeedPostResponse[] = await Promise.all(
      posts.map(async (p) => {
        const author = userMap.get(p.userId) ?? null;
        const reactionCount = countByPostId.get(p.id) ?? 0;
        const hasReacted = reactedPostIds.has(p.id);
        return this.toFeedPost(p, author, reactionCount, hasReacted);
      }),
    );

    return {
      posts: feedPosts,
      page: Math.max(1, page),
      limit: cappedLimit,
      total,
    };
  }

  async toggleReaction(
    userId: string,
    postId: string,
  ): Promise<{ reactionCount: number; hasReacted: boolean }> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Publicación no encontrada');

    const existing = await this.reactionRepo.findOne({
      where: { postId, userId },
    });

    if (existing) {
      await this.reactionRepo.remove(existing);
      const count = await this.reactionRepo.count({ where: { postId } });
      return { reactionCount: count, hasReacted: false };
    }

    const reaction = this.reactionRepo.create({ postId, userId });
    await this.reactionRepo.save(reaction);
    const count = await this.reactionRepo.count({ where: { postId } });
    return { reactionCount: count, hasReacted: true };
  }

  private async toFeedPost(
    post: Post,
    author: User | null,
    reactionCount: number,
    hasReacted: boolean = false,
  ): Promise<FeedPostResponse> {
    const resolvedAuthor = author ?? (await this.loadAuthorForPost(post));
    return {
      id: post.id,
      authorName: resolvedAuthor?.name ?? 'Usuario',
      authorUsername: null,
      authorAvatar: null,
      time: post.createdAt.toISOString(),
      createdAt: post.createdAt.toISOString(),
      text: post.text,
      currentDay: post.currentDay,
      totalDays: post.totalDays,
      progressPercent: post.progressPercent,
      evidenceImageUrl: post.evidenceImageUrl ?? null,
      evidenceLink: post.evidenceLink ?? null,
      reactionCount,
      hasReacted,
    };
  }
}
