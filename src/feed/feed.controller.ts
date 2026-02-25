import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { FeedService } from './feed.service';

@Controller('feed/posts')
@UseGuards(AuthGuard('jwt'))
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  /** Rutas con segmento literal primero (comments antes que :id/reactions). */
  @Get(':postId/comments')
  async getComments(
    @CurrentUser('userId') userId: string,
    @Param('postId') postId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10) || 50)) : 50;
    return this.feedService.getComments(userId, postId, pageNum, limitNum);
  }

  @Post(':postId/comments')
  @HttpCode(HttpStatus.CREATED)
  async createComment(
    @CurrentUser('userId') userId: string,
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.feedService.createComment(userId, postId, dto);
  }

  @Post(':id/reactions')
  async toggleReaction(
    @CurrentUser('userId') userId: string,
    @Param('id') postId: string,
  ) {
    return this.feedService.toggleReaction(userId, postId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.feedService.create(userId, dto);
  }

  @Get()
  async findAll(
    @CurrentUser('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.min(50, Math.max(1, parseInt(limit, 10) || 20)) : 20;
    return this.feedService.findAll(userId, pageNum, limitNum);
  }
}
