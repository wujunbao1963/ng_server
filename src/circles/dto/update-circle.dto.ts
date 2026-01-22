import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCircleDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;
}
