import { Injectable } from '@nestjs/common'

import { TokenStoreService } from '../../auth/token-store.service'
import { success } from '../../common/http/ruoyi-response'
import { PrismaService } from '../../infra/prisma/prisma.service'
import { mockCacheKeys, mockCacheNames, mockCacheValues, mockServerInfo } from '../../mock/monitor.mock'

@Injectable()
export class CacheService {
  private readonly captchaCache = new Map<string, Record<string, unknown>>([
    ['captcha:uuid-1', { code: 'A7KD', expireIn: 120 }],
  ])

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenStore: TokenStoreService,
  ) {}

  async getCache() {
    const snapshot = await this.buildSnapshot()
    const allKeys = Object.values(snapshot.keys).reduce((sum, keys) => sum + keys.length, 0)

    return success({
      info: snapshot.info,
      commandStats: snapshot.commandStats,
      dbSize: allKeys,
      cacheNames: snapshot.names.length,
      cacheKeys: allKeys,
    })
  }

  async getNames() {
    const snapshot = await this.buildSnapshot()
    return success(snapshot.names)
  }

  async getKeys(cacheName: string) {
    const snapshot = await this.buildSnapshot()
    return success((snapshot.keys[cacheName] ?? []).map(cacheKey => ({ cacheKey })))
  }

  async getValue(cacheName: string, cacheKey: string) {
    const snapshot = await this.buildSnapshot()
    return success({ cacheValue: snapshot.values[cacheName]?.[cacheKey] ?? null })
  }

  async clearCacheName(cacheName: string) {
    await this.clearByName(cacheName)
    return success(undefined, '清理成功')
  }

  async clearCacheKey(cacheKey: string) {
    await this.clearByKey(cacheKey)
    return success(undefined, '清理成功')
  }

  async clearCacheAll() {
    const snapshot = await this.buildSnapshot()
    for (const cacheName of Object.keys(snapshot.keys)) {
      await this.clearByName(cacheName)
    }
    return success(undefined, '全部清理成功')
  }

  private async buildSnapshot() {
    const [configs, dictTypes, notices] = await Promise.all([
      this.prisma.safeCall(() => this.prisma.sysConfig.findMany({
        select: {
          configKey: true,
          configName: true,
          configValue: true,
        },
        orderBy: { configId: 'asc' },
      })),
      this.prisma.safeCall(() => this.prisma.sysDictType.findMany({
        select: {
          dictType: true,
          dictName: true,
          status: true,
        },
        orderBy: { dictId: 'asc' },
      })),
      this.prisma.safeCall(() => this.prisma.sysNotice.findMany({
        select: {
          noticeId: true,
          noticeTitle: true,
          noticeType: true,
          status: true,
        },
        orderBy: { noticeId: 'desc' },
        take: 20,
      })),
    ])

    const sessions = this.tokenStore.listSessions()
    const loginTokenKeys = sessions.map(session => `login_tokens:${session.tokenId}`)
    const loginTokenValues = Object.fromEntries(sessions.map((session) => {
      const key = `login_tokens:${session.tokenId}`
      return [key, {
        userId: session.userId,
        userName: session.userName ?? `user-${session.userId}`,
        deptName: session.deptName ?? '--',
        ipaddr: session.ipaddr ?? '127.0.0.1',
        loginLocation: session.loginLocation ?? '内网',
        browser: session.browser ?? 'Unknown',
        os: session.os ?? 'Unknown',
        loginTime: session.loginTime ?? new Date().toISOString(),
      }]
    }))

    const configRows = configs ?? []
    const configKeys = configRows.map(item => `system_config:${item.configKey}`)
    const configValues = Object.fromEntries(configRows.map(item => {
      const key = `system_config:${item.configKey}`
      return [key, item]
    }))

    const dictRows = dictTypes ?? []
    const dictKeys = dictRows.map(item => `dict_types:${item.dictType}`)
    const dictValues = Object.fromEntries(dictRows.map(item => {
      const key = `dict_types:${item.dictType}`
      return [key, item]
    }))

    const noticeRows = notices ?? []
    const noticeKeys = noticeRows.map(item => `notices:${item.noticeId}`)
    const noticeValues = Object.fromEntries(noticeRows.map(item => {
      const key = `notices:${item.noticeId}`
      return [key, item]
    }))

    const captchaKeys = Array.from(this.captchaCache.keys())
    const captchaValues = Object.fromEntries(this.captchaCache.entries())

    const keyMap: Record<string, string[]> = {
      login_tokens: loginTokenKeys,
      system_config: configKeys,
      dict_types: dictKeys,
      notices: noticeKeys,
      captcha_codes: captchaKeys,
    }

    const names = [
      { cacheName: 'login_tokens', remark: '登录令牌缓存' },
      { cacheName: 'system_config', remark: '参数缓存快照' },
      { cacheName: 'dict_types', remark: '字典类型快照' },
      { cacheName: 'notices', remark: '公告列表快照' },
      { cacheName: 'captcha_codes', remark: '验证码缓存' },
    ].filter(item => (keyMap[item.cacheName] ?? []).length > 0 || item.cacheName === 'captcha_codes')

    const totalMemory = process.memoryUsage().heapTotal
    const usedMemory = process.memoryUsage().heapUsed
    const maxMemory = Number(process.env.CACHE_MAX_MEMORY_MB ?? 512) * 1024 * 1024

    return {
      names: names.length ? names : mockCacheNames,
      keys: Object.keys(keyMap).length ? keyMap : mockCacheKeys,
      values: {
        login_tokens: loginTokenValues,
        system_config: configValues,
        dict_types: dictValues,
        notices: noticeValues,
        captcha_codes: captchaValues,
      },
      info: {
        redis_version: 'nest-runtime-1.0',
        redis_mode: 'standalone',
        tcp_port: Number(process.env.PORT ?? 3000),
        connected_clients: sessions.length,
        uptime_in_days: Math.max(1, Math.floor(process.uptime() / 86400)),
        used_memory_human: this.formatBytes(usedMemory),
        maxmemory_human: this.formatBytes(maxMemory),
        aof_enabled: 0,
        rdb_last_bgsave_status: 'ok',
        instantaneous_input_kbps: Number((sessions.length * 0.42).toFixed(2)),
        instantaneous_output_kbps: Number((sessions.length * 0.31).toFixed(2)),
      },
      commandStats: [
        { name: '缓存名称', value: names.length },
        { name: '缓存键', value: Object.values(keyMap).reduce((sum, keys) => sum + keys.length, 0) },
        { name: '在线会话', value: sessions.length },
        { name: '堆内存', value: `${this.formatBytes(usedMemory)} / ${this.formatBytes(totalMemory)}` },
      ],
    }
  }

  private async clearByName(cacheName: string) {
    switch (cacheName) {
      case 'login_tokens': {
        this.tokenStore.listSessions().forEach(session => this.tokenStore.revokeToken(session.tokenId))
        break
      }
      case 'captcha_codes': {
        this.captchaCache.clear()
        break
      }
      default:
        break
    }
  }

  private async clearByKey(cacheKey: string) {
    if (cacheKey.startsWith('login_tokens:')) {
      this.tokenStore.revokeToken(cacheKey.slice('login_tokens:'.length))
      return
    }

    if (cacheKey.startsWith('captcha:')) {
      this.captchaCache.delete(cacheKey)
    }
  }

  private formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return '0 B'
    }
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let index = 0
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024
      index += 1
    }
    return `${size.toFixed(size >= 10 || index === 0 ? 0 : 2)} ${units[index]}`
  }
}
