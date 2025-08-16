import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Project } from 'src/projects/entities/project.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    const { projectId, assignedToId, dependsOnIds, ...rest } = createTaskDto;

    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    // ✔ assignedTo: only set when user is found (no null assignment)
    let assignedTo: User | undefined = undefined;
    if (assignedToId) {
      const user = await this.userRepo.findOne({ where: { id: assignedToId } });
      if (!user) throw new NotFoundException('Assigned user not found');
      assignedTo = user; // user is User (non-null) here
    }

    // dependencies
    let dependencies: Task[] = [];
    if (dependsOnIds?.length) {
      dependencies = await this.taskRepo.findBy({ id: In(dependsOnIds) });
      if (dependencies.length !== dependsOnIds.length) {
        throw new BadRequestException('Some dependent tasks not found');
      }
    }

    const task = this.taskRepo.create({
      ...rest,
      project,
      assignedTo, // type: User | undefined — OK for nullable relation
      dependsOn: dependencies,
      priorityValue: this.getPriorityValue(rest.priority),
    });

    return this.taskRepo.save(task);
  }

  findAll(): Promise<Task[]> {
    return this.taskRepo.find({
      relations: ['project', 'assignedTo', 'dependsOn'],
    });
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: ['project', 'assignedTo', 'dependsOn'],
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);

    if (updateTaskDto.projectId) {
      const project = await this.projectRepo.findOne({
        where: { id: updateTaskDto.projectId },
      });
      if (!project) throw new NotFoundException('Project not found');
      task.project = project;
    }

    if (updateTaskDto.assignedToId) {
      const user = await this.userRepo.findOne({
        where: { id: updateTaskDto.assignedToId },
      });
      if (!user) throw new NotFoundException('Assigned user not found');
      task.assignedTo = user; // user is User (non-null) here
    } else if (updateTaskDto.assignedToId === null) {
      task.assignedTo = undefined; // or = null, depending on your entity typing
    }

    if (updateTaskDto.dependsOnIds?.length) {
      const dependencies = await this.taskRepo.findBy({
        id: In(updateTaskDto.dependsOnIds),
      });
      if (dependencies.length !== updateTaskDto.dependsOnIds.length) {
        throw new BadRequestException('Some dependent tasks not found');
      }
      task.dependsOn = dependencies;
    }

    if (updateTaskDto.priority) {
      task.priorityValue = this.getPriorityValue(updateTaskDto.priority);
    }

    Object.assign(task, updateTaskDto);

    return this.taskRepo.save(task);
  }

  async remove(id: string): Promise<void> {
    const task = await this.findOne(id);
    await this.taskRepo.remove(task);
  }

  private getPriorityValue(priority?: string): number {
    switch (priority) {
      case 'LOW':
        return 1;
      case 'HIGH':
        return 3;
      default:
        return 2; // MEDIUM
    }
  }

  // ---------------- Topological sort ----------------
  async getTasksSortedByDependencies(projectId: string): Promise<Task[]> {
    const tasks = await this.taskRepo.find({
      where: { project: { id: projectId } },
      relations: ['dependsOn'],
    });

    const visited = new Map<string, boolean>();
    const sorted: Task[] = [];

    const visit = (task: Task, ancestors = new Set<string>()) => {
      if (ancestors.has(task.id)) {
        throw new BadRequestException('Circular dependency detected');
      }
      if (visited.get(task.id)) return;

      ancestors.add(task.id);
      task.dependsOn?.forEach((dep) => visit(dep, ancestors));
      ancestors.delete(task.id);

      visited.set(task.id, true);
      sorted.push(task);
    };

    tasks.forEach((t) => visit(t));

    // secondary sort: priority
    sorted.sort((a, b) => b.priorityValue - a.priorityValue);
    return sorted;
  }
}
