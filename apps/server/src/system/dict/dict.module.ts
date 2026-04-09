import { Module } from '@nestjs/common'

import { DictDataModule } from './data/data.module'
import { DictTypeModule } from './type/type.module'

@Module({
  imports: [DictTypeModule, DictDataModule],
})
export class DictModule {}