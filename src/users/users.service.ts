// src/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  // --- Create user with role restriction ---
  async create(user: Partial<User>, currentUserRole?: UserRole) {
    // Restrict assigning SUPER_ADMIN or ADMIN if current user is not SUPER_ADMIN
    if (
      user.role === UserRole.SUPER_ADMIN &&
      currentUserRole !== UserRole.SUPER_ADMIN
    ) {
      throw new BadRequestException(
        'Only SUPER_ADMIN can assign SUPER_ADMIN role',
      );
    }
    if (
      user.role === UserRole.ADMIN &&
      currentUserRole !== UserRole.SUPER_ADMIN
    ) {
      throw new BadRequestException('Only SUPER_ADMIN can assign ADMIN role');
    }

    const u = this.repo.create(user);
    return this.repo.save(u);
  }

  // --- Update user with role restriction ---
  async update(id: string, update: Partial<User>, currentUserRole?: UserRole) {
    // Restrict updating role to higher roles
    if (
      (update.role === UserRole.SUPER_ADMIN ||
        update.role === UserRole.ADMIN) &&
      currentUserRole !== UserRole.SUPER_ADMIN
    ) {
      throw new BadRequestException(
        'Only SUPER_ADMIN can assign or update to SUPER_ADMIN/ADMIN role',
      );
    }

    const entity = await this.repo.preload({ id, ...update });
    if (!entity) throw new NotFoundException('User not found');
    return this.repo.save(entity);
  }

  async findAll() {
    return this.repo.find();
  }

  async findOne(id: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async remove(id: string) {
    const result = await this.repo.delete(id);
    if (result.affected === 0) throw new NotFoundException('User not found');
    return { deleted: true };
  }

  // --- Existing helpers ---
  findByEmail = async (email: string) =>
    this.repo.findOne({ where: { email } });

  findById = async (id: string) => this.repo.findOne({ where: { id } });

  setRefreshTokenHash = async (id: string, hash: string | null) => {
    await this.repo.update(id, { currentRefreshTokenHash: hash });
  };
}
