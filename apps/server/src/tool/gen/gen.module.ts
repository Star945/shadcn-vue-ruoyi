import { Module } from '@nestjs/common'

import { PrismaModule } from '../../infra/prisma/prisma.module'
import { GenController } from './gen.controller'
import { GenService } from './gen.service'

@Module({
  imports: [PrismaModule],
  controllers: [GenController],
  providers: [GenService],
})
export class GenModule {}