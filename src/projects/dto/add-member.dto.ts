import { IsEnum, IsUUID } from 'class-validator';
import { ProjectRole } from '../entities/project-member.entity';

export class AddMemberDto {
  @IsUUID()
  userId: string;

  @IsEnum(ProjectRole)
  role: ProjectRole;
}
