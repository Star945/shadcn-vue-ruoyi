import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)
  private availability: boolean | null = null

  async onModuleDestroy() {
    await this.$disconnect().catch(() => undefined)
  }

  async safeCall<T>(runner: () => Promise<T>): Promise<T | undefined> {
    try {
      const result = await runner()
      this.markAvailability(true)
      return result
    }
    catch (error) {
      this.markAvailability(false, error)
      return undefined
    }
  }

  private markAvailability(next: boolean, error?: unknown) {
    if (this.availability === next) {
      return
    }

    this.availability = next
    if (next) {
      this.logger.log('Prisma 数据源可用')
      return
    }

    const message = error instanceof Error ? error.message : '数据库当前不可用，已回退到 mock 数据。'
    this.logger.warn(message)
  }
}
