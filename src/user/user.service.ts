import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { publicUsername } from '../common/username.util';
import { User } from './entities/user.entity';

export interface PublicProfileResponse {
  id: string;
  username: string;
  name: string | null;
  avatarUrl?: string | null;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Perfil público por id. El frontend usa `username` (siempre string no vacío)
   * para redirigir /profile/id/:id → /profile/:username.
   */
  async getPublicProfile(userId: string): Promise<PublicProfileResponse> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'name'],
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return {
      id: user.id,
      username: publicUsername({
        username: null,
        name: user.name,
        id: user.id,
      }),
      name: user.name ?? null,
      avatarUrl: null,
    };
  }
}
