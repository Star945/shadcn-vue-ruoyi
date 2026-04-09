import { Module } from '@nestjs/common'

import { OperlogController } from './operlog.controller'
import { OperlogService } from './operlog.service'

@Module({
  controllers: [OperlogController],
  providers: [OperlogService],
  exports: [OperlogService],
})
export class OperlogModule {}