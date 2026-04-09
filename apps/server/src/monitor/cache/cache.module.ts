import { Module } from '@nestjs/common'

import { AuthModule } from '../../auth/auth.module'
import { CacheController } from './cache.controller'
import { CacheService } from './cache.service'

@Module({
  imports: [AuthModule],
  controllers: [CacheController],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}