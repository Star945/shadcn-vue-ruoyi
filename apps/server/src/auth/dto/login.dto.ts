import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username!: string

  @IsString()
  @IsNotEmpty()
  password!: string

  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsString()
  uuid?: string
}
