import { Controller, Delete, Get, Param } from '@nestjs/common'

import { CacheService } from './cache.service'

@Controller('monitor/cache')
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  @Get()
  getCache() {
    return this.cacheService.getCache()
  }

  @Get('getNames')
  getNames() {
    return this.cacheService.getNames()
  }

  @Get('getKeys/:cacheName')
  getKeys(@Param('cacheName') cacheName: string) {
    return this.cacheService.getKeys(cacheName)
  }

  @Get('getValue/:cacheName/:cacheKey')
  getValue(@Param('cacheName') cacheName: string, @Param('cacheKey') cacheKey: string) {
    return this.cacheService.getValue(cacheName, cacheKey)
  }

  @Delete('clearCacheName/:cacheName')
  clearCacheName(@Param('cacheName') cacheName: string) {
    return this.cacheService.clearCacheName(cacheName)
  }

  @Delete('clearCacheKey/:cacheKey')
  clearCacheKey(@Param('cacheKey') cacheKey: string) {
    return this.cacheService.clearCacheKey(cacheKey)
  }

  @Delete('clearCacheAll')
  clearCacheAll() {
    return this.cacheService.clearCacheAll()
  }
}
