import { Injectable } from '@nestjs/common'
import os from 'node:os'

import { success } from '../../common/http/ruoyi-response'
import { mockServerInfo } from '../../mock/monitor.mock'

@Injectable()
export class ServerService {
  getServer() {
    try {
      const cpus = os.cpus()
      const cpuNum = cpus.length || 1
      const totalMem = os.totalmem()
      const freeMem = os.freemem()
      const usedMem = totalMem - freeMem
      const uptimeSeconds = os.uptime()
      const processMemory = process.memoryUsage()
      const diskFallback = Array.isArray(mockServerInfo.sysFiles) ? mockServerInfo.sysFiles : []

      return success({
        cpu: {
          cpuNum,
          total: Number(((usedMem / totalMem) * 100).toFixed(2)),
          sys: Number((process.cpuUsage().system / 1000000).toFixed(2)),
          used: Number(((1 - os.freemem() / totalMem) * 100).toFixed(2)),
          wait: 0,
          free: Number(((freeMem / totalMem) * 100).toFixed(2)),
        },
        mem: {
          total: this.toGb(totalMem),
          used: this.toGb(usedMem),
          free: this.toGb(freeMem),
          usage: Number(((usedMem / totalMem) * 100).toFixed(2)),
        },
        jvm: {
          name: 'Node.js',
          version: process.version,
          startTime: new Date(Date.now() - process.uptime() * 1000).toISOString().replace('T', ' ').slice(0, 19),
          runTime: this.formatDuration(process.uptime()),
          home: process.execPath,
          inputArgs: process.execArgv.join(' ') || '--',
          total: this.toMb(processMemory.heapTotal),
          used: this.toMb(processMemory.heapUsed),
          free: this.toMb(Math.max(processMemory.heapTotal - processMemory.heapUsed, 0)),
          usage: Number(((processMemory.heapUsed / Math.max(processMemory.heapTotal, 1)) * 100).toFixed(2)),
        },
        sys: {
          computerName: os.hostname(),
          computerIp: this.resolvePrimaryIp(),
          osName: `${os.type()} ${os.release()}`,
          osArch: os.arch(),
          userDir: process.cwd(),
        },
        sysFiles: diskFallback,
      })
    }
    catch {
      return success(mockServerInfo)
    }
  }

  private resolvePrimaryIp() {
    const networks = os.networkInterfaces()
    for (const group of Object.values(networks)) {
      for (const net of group ?? []) {
        if (net && net.family === 'IPv4' && !net.internal) {
          return net.address
        }
      }
    }
    return '127.0.0.1'
  }

  private toGb(bytes: number) {
    return Number((bytes / 1024 / 1024 / 1024).toFixed(2))
  }

  private toMb(bytes: number) {
    return Number((bytes / 1024 / 1024).toFixed(0))
  }

  private formatDuration(seconds: number) {
    const total = Math.max(0, Math.floor(seconds))
    const days = Math.floor(total / 86400)
    const hours = Math.floor((total % 86400) / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    if (days > 0) {
      return `${days} 天 ${hours} 小时 ${minutes} 分钟`
    }
    if (hours > 0) {
      return `${hours} 小时 ${minutes} 分钟`
    }
    return `${minutes} 分钟`
  }
}
