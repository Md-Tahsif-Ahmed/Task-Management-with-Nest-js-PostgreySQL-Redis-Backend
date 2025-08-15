// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  async create(user: Partial<User>) {
    const u = this.repo.create(user);
    return this.repo.save(u);
  }

  async findAll() {
    return this.repo.find();
  }

  async findOne(id: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, update: Partial<User>) {
    // preload merges { id, ...update } into an entity instance if it exists
    const entity = await this.repo.preload({ id, ...update });
    if (!entity) throw new NotFoundException('User not found');
    return this.repo.save(entity);
  }

  async remove(id: string) {
    const result = await this.repo.delete(id);
    if (result.affected === 0) throw new NotFoundException('User not found');
    return { deleted: true };
  }

  // --- existing helpers you had ---
  findByEmail = async (email: string) =>
    this.repo.findOne({ where: { email } });

  findById = async (id: string) => this.repo.findOne({ where: { id } });

  setRefreshTokenHash = async (id: string, hash: string | null) => {
    await this.repo.update(id, { currentRefreshTokenHash: hash });
  };
}
