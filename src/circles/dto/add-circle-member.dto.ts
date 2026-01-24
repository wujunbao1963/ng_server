import { IsEmail, IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddCircleMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsIn(['caretaker', 'acting_owner', 'witness'])
  role!: 'caretaker' | 'acting_owner' | 'witness';

  @IsISO8601()
  @IsOptional()
  validUntil?: string;
}
