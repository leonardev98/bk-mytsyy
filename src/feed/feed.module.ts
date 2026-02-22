import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { Post } from './entities/post.entity';
import { Reaction } from './entities/reaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, Reaction, User]),
  ],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService],
})
export class FeedModule {}
