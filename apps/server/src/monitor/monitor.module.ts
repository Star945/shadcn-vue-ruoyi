import { Module } from '@nestjs/common'

import { CacheModule } from './cache/cache.module'
import { DruidModule } from './druid/druid.module'
import { JobLogModule } from './job-log/job-log.module'
import { JobModule } from './job/job.module'
import { LogininforModule } from './logininfor/logininfor.module'
import { OnlineModule } from './online/online.module'
import { OperlogModule } from './operlog/operlog.module'
import { ServerModule } from './server/server.module'

@Module({
  imports: [
    OnlineModule,
    LogininforModule,
    OperlogModule,
    JobModule,
    JobLogModule,
    CacheModule,
    ServerModule,
    DruidModule,
  ],
  exports: [OperlogModule],
})
export class MonitorModule {}