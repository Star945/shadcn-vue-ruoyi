import { Module } from '@nestjs/common'

import { JobLogController } from './job-log.controller'
import { JobLogService } from './job-log.service'

@Module({
  controllers: [JobLogController],
  providers: [JobLogService],
})
export class JobLogModule {}
