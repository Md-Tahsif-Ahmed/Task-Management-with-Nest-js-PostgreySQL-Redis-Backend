import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';

import { Project } from 'src/projects/entities/project.entity';
import { User } from 'src/users/entities/user.entity';
import { TaskService } from './tasks.service';
import { TaskController } from './tasks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Project, User])],
  providers: [TaskService],
  controllers: [TaskController],
})
export class TaskModule {}
