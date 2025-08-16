import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectStatus } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  /** kebab-case slugify */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  /** ensure slug uniqueness by suffixing -1, -2, ... */
  private async ensureUniqueSlug(base: string): Promise<string> {
    let candidate = base;
    let i = 1;
    // NOTE: add an index/unique constraint on slug in DB (you have unique: true already)
    while (await this.projectRepo.findOne({ where: { slug: candidate } })) {
      candidate = `${base}-${i++}`;
    }
    return candidate;
  }

  /** CREATE: dto has { name, description? } — server generates slug */
  async create(dto: CreateProjectDto, ownerId: string): Promise<Project> {
    const baseSlug = this.slugify(dto.name);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const entity = this.projectRepo.create({
      slug,
      name: dto.name,
      description: dto.description,
      status: ProjectStatus.ACTIVE,
      // relation by id (no need to load User entity)
      owner: { id: ownerId } as unknown as Project['owner'],
    });

    return this.projectRepo.save(entity);
  }

  /** LIST: only projects owned by current user */
  async findAll(ownerId: string): Promise<Project[]> {
    return this.projectRepo.find({
      where: { owner: { id: ownerId } },
      relations: { owner: true, members: true },
      order: { createdAt: 'DESC' },
    });
  }

  /** READ: one project by id, scoping to ownerId */
  async findOne(id: string, ownerId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id, owner: { id: ownerId } },
      relations: { owner: true, members: { user: true } },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  /** UPDATE: only name/description from UpdateProjectDto */
  async update(
    id: string,
    dto: UpdateProjectDto,
    ownerId: string,
  ): Promise<Project> {
    const project = await this.findOne(id, ownerId);

    if (dto.name !== undefined) {
      project.name = dto.name;
      // const nextSlug = await this.ensureUniqueSlug(this.slugify(dto.name));
      // project.slug = nextSlug;
    }
    if (dto.description !== undefined) {
      project.description = dto.description;
    }

    return this.projectRepo.save(project);
  }

  /** DELETE: scoped to ownerId */
  async remove(id: string, ownerId: string): Promise<void> {
    const project = await this.findOne(id, ownerId);
    await this.projectRepo.remove(project);
  }
}
