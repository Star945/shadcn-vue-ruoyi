import { Module } from '@nestjs/common'

import { LogininforController } from './logininfor.controller'
import { LogininforService } from './logininfor.service'

@Module({
  controllers: [LogininforController],
  providers: [LogininforService],
})
export class LogininforModule {}
