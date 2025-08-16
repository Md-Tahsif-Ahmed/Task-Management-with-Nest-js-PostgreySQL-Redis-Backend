import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Project } from 'src/projects/entities/project.entity';

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

@Entity()
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({ type: 'int', default: 2 })
  priorityValue: number; // LOW=1, MEDIUM=2, HIGH=3

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  @Column({ type: 'timestamp', nullable: true })
  dueDate?: Date;

  @ManyToMany(() => Task, { nullable: true })
  @JoinTable()
  dependsOn?: Task[];

  @ManyToOne(() => Project, (project: Project) => project.tasks, {
    onDelete: 'CASCADE',
  })
  project!: Project;

  @ManyToOne(() => User, (user: User) => user.tasks, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  assignedTo?: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
