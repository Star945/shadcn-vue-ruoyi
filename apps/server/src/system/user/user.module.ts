import { Module } from '@nestjs/common'

import { AuthModule } from '../../auth/auth.module'
import { UploadModule } from '../../common/upload/upload.module'
import { UserController } from './user.controller'
import { UserService } from './user.service'

@Module({
  imports: [AuthModule, UploadModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}