import { Module } from '@nestjs/common'

import { PrismaModule } from '../infra/prisma/prisma.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { TokenStoreService } from './token-store.service'

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, TokenStoreService],
  exports: [TokenStoreService],
})
export class AuthModule {}
