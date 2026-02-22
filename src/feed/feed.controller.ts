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
import { CreatePostDto } from './dto/create-post.dto';
import { FeedService } from './feed.service';

@Controller('feed/posts')
@UseGuards(AuthGuard('jwt'))
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  /** Ruta paramétrica primero para que no sea capturada por otras. */
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
