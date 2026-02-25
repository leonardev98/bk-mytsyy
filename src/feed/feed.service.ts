import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { publicUsername } from '../common/username.util';
import { User } from '../user/entities/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { Comment } from './entities/comment.entity';
import { Post } from './entities/post.entity';
import { Reaction } from './entities/reaction.entity';

export interface FeedPostResponse {
  id: string;
  authorId: string;
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

export interface FeedCommentResponse {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorUsername: string | null;
  authorAvatar: string | null;
  text: string;
  createdAt: string;
}

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(Reaction)
    private readonly reactionRepo: Repository<Reaction>,
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
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

  /** Comprueba si el usuario puede ver (y comentar) la publicación. */
  private canUserSeePost(post: Post, userId: string): boolean {
    if (post.audience === 'public' || post.audience === 'builders') return true;
    if (post.audience === 'only_me' && post.userId === userId) return true;
    return false;
  }

  async getComments(
    userId: string,
    postId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ comments: FeedCommentResponse[]; page: number; limit: number; total: number }> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Publicación no encontrada');
    if (!this.canUserSeePost(post, userId)) {
      throw new ForbiddenException('No tienes permiso para ver esta publicación');
    }

    const cappedLimit = Math.min(Math.max(1, limit), 100);
    const skip = (Math.max(1, page) - 1) * cappedLimit;

    const [comments, total] = await this.commentRepo.findAndCount({
      where: { postId },
      order: { createdAt: 'ASC' },
      skip,
      take: cappedLimit,
    });

    if (comments.length === 0) {
      return { comments: [], page: Math.max(1, page), limit: cappedLimit, total: 0 };
    }

    const authorIds = [...new Set(comments.map((c) => c.userId))];
    const users = await this.userRepo.find({
      where: authorIds.map((id) => ({ id })),
      select: ['id', 'name'],
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const feedComments: FeedCommentResponse[] = comments.map((c) => {
      const author = userMap.get(c.userId);
      return this.toFeedComment(c, author ?? null);
    });

    return {
      comments: feedComments,
      page: Math.max(1, page),
      limit: cappedLimit,
      total,
    };
  }

  async createComment(
    userId: string,
    postId: string,
    dto: CreateCommentDto,
  ): Promise<FeedCommentResponse> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Publicación no encontrada');
    if (!this.canUserSeePost(post, userId)) {
      throw new ForbiddenException('No tienes permiso para comentar en esta publicación');
    }

    const text = (dto.text ?? '').trim();
    if (!text) throw new BadRequestException('El texto del comentario no puede estar vacío');

    let parentId: string | null = null;
    if (dto.parentId != null && dto.parentId !== '') {
      const parent = await this.commentRepo.findOne({
        where: { id: dto.parentId, postId },
      });
      if (!parent) {
        throw new BadRequestException(
          'El comentario padre no existe o no pertenece a esta publicación',
        );
      }
      parentId = parent.id;
    }

    const comment = this.commentRepo.create({
      postId,
      userId,
      parentId,
      text,
    });
    const saved = await this.commentRepo.save(comment);
    const author = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'name'],
    });
    return this.toFeedComment(saved, author ?? null);
  }

  private toFeedComment(c: Comment, author: User | null): FeedCommentResponse {
    return {
      id: c.id,
      postId: c.postId,
      parentId: c.parentId ?? null,
      authorId: c.userId,
      authorName: author?.name ?? 'Usuario',
      authorUsername: publicUsername({
        username: null,
        name: author?.name ?? null,
        id: c.userId,
      }),
      authorAvatar: null,
      text: c.text,
      createdAt: c.createdAt.toISOString(),
    };
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
      authorId: post.userId,
      authorName: resolvedAuthor?.name ?? 'Usuario',
      authorUsername: publicUsername({
        username: null,
        name: resolvedAuthor?.name ?? null,
        id: post.userId,
      }),
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
