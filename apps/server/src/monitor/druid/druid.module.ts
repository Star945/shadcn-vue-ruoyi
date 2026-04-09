import { Module } from '@nestjs/common'

import { CacheModule } from '../cache/cache.module'
import { ServerModule } from '../server/server.module'
import { DruidController } from './druid.controller'

@Module({
  imports: [ServerModule, CacheModule],
  controllers: [DruidController],
})
export class DruidModule {}