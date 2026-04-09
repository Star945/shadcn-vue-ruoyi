import { Module } from '@nestjs/common'

import { AuthModule } from '../../auth/auth.module'
import { OnlineController } from './online.controller'
import { OnlineService } from './online.service'

@Module({
  imports: [AuthModule],
  controllers: [OnlineController],
  providers: [OnlineService],
})
export class OnlineModule {}
