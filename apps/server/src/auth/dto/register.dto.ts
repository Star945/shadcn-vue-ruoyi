import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator'

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  username!: string

  @IsString()
  @MinLength(6)
  password!: string

  @IsOptional()
  @IsString()
  nickName?: string

  @IsOptional()
  @IsString()
  email?: string

  @IsOptional()
  @IsString()
  phonenumber?: string

  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsString()
  uuid?: string
}
