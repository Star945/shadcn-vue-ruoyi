import { Module } from '@nestjs/common'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'

import { AuthModule } from './auth/auth.module'
import { SessionAuthGuard } from './common/guards/session-auth.guard'
import { UploadModule } from './common/upload/upload.module'
import { OperlogInterceptor } from './common/interceptors/operlog.interceptor'
import { PrismaModule } from './infra/prisma/prisma.module'
import { MonitorModule } from './monitor/monitor.module'
import { SystemModule } from './system/system.module'
import { ToolModule } from './tool/tool.module'

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UploadModule,
    SystemModule,
    MonitorModule,
    ToolModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: SessionAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: OperlogInterceptor,
    },
  ],
})
export class AppModule {}
