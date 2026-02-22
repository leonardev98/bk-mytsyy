import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import {
  createInitialSession,
  type PersistentSession,
} from './interfaces/session.interface';
import type { ConversationPhase } from './interfaces/conversation-state.interface';

const KEY_PREFIX = 'session:';
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

@Injectable()
export class RedisMemoryService {
  private readonly ttlSeconds: number;
  private readonly memoryFallback = new Map<string, PersistentSession>();

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    this.ttlSeconds =
      this.config.get<number>('SESSION_TTL_SECONDS', DEFAULT_TTL_SECONDS) ?? DEFAULT_TTL_SECONDS;
  }

  private key(sessionId: string): string {
    return `${KEY_PREFIX}${sessionId}`;
  }

  /**
   * Obtiene la sesión por sessionId. Si no existe, devuelve null (el orquestador creará una nueva).
   */
  async get(sessionId: string): Promise<PersistentSession | null> {
    if (this.redis.isAvailable()) {
      const raw = await this.redis.get(this.key(sessionId));
      if (!raw) return null;
      try {
        return JSON.parse(raw) as PersistentSession;
      } catch {
        return null;
      }
    }
    return this.memoryFallback.get(sessionId) ?? null;
  }

  /**
   * Persiste la sesión. Si Redis no está disponible, usa memoria.
   */
  async set(sessionId: string, session: PersistentSession): Promise<void> {
    const updated: PersistentSession = {
      ...session,
      updatedAt: new Date().toISOString(),
    };
    const serialized = JSON.stringify(updated);

    if (this.redis.isAvailable()) {
      const client = this.redis.getClient();
      if (client) {
        await this.redis.set(this.key(sessionId), serialized, this.ttlSeconds);
      }
    } else {
      this.memoryFallback.set(sessionId, updated);
    }
  }

  /**
   * Obtiene o crea sesión inicial (GREETING).
   */
  async getOrCreate(sessionId: string, initialState?: ConversationPhase): Promise<PersistentSession> {
    const existing = await this.get(sessionId);
    if (existing) return existing;
    const session = createInitialSession(initialState ?? 'GREETING');
    await this.set(sessionId, session);
    return session;
  }

  async delete(sessionId: string): Promise<void> {
    if (this.redis.isAvailable()) {
      await this.redis.del(this.key(sessionId));
    } else {
      this.memoryFallback.delete(sessionId);
    }
  }
}
