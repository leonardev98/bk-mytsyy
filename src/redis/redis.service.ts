import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis client. Si REDIS_URL no está definida, el cliente es null
 * y los servicios usan fallback en memoria (RedisMemoryService).
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis | null;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL')?.trim();
    this.client = url ? new Redis(url, { maxRetriesPerRequest: null }) : null;
  }

  isAvailable(): boolean {
    return this.client != null;
  }

  getClient(): Redis | null {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    if (ttlSeconds != null) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      this.client.disconnect();
    }
  }
}
