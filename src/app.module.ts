import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { FeedModule } from './feed/feed.module';
import { ProjectModule } from './project/project.module';
import { RedisModule } from './redis/redis.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const sslEnabled = config.get('POSTGRES_SSL', 'false') === 'true';
        return {
          type: 'postgres',
          host: config.get('POSTGRES_HOST', 'localhost'),
          port: config.get('POSTGRES_PORT', 5432),
          username: config.get('POSTGRES_USER', 'postgres'),
          password: config.get('POSTGRES_PASSWORD', 'postgres'),
          database: config.get('POSTGRES_DB', 'mytsyy'),
          ...(sslEnabled && {
            ssl: { rejectUnauthorized: false },
          }),
          autoLoadEntities: true,
          synchronize: false, // tablas creadas a mano (ej. ejecutando docs/sql en DBeaver)
        };
      },
    }),
    AiModule,
    AuthModule,
    ChatModule,
    FeedModule,
    ProjectModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
