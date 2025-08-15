import {
  IsNotEmpty,
  IsString,
  IsOptional,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase kebab-case (letters, numbers, hyphens)',
  })
  @MaxLength(80)
  slug: string;
}
