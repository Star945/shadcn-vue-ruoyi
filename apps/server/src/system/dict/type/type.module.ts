import { Module } from '@nestjs/common'

import { DictTypeController } from './type.controller'
import { DictTypeService } from './type.service'

@Module({
  controllers: [DictTypeController],
  providers: [DictTypeService],
})
export class DictTypeModule {}