import { Module } from '@nestjs/common'

import { DictDataController } from './data.controller'
import { DictDataService } from './data.service'

@Module({
  controllers: [DictDataController],
  providers: [DictDataService],
})
export class DictDataModule {}