import { Injectable } from '@nestjs/common'

import { TokenStoreService } from '../../auth/token-store.service'
import { table, success } from '../../common/http/ruoyi-response'
import { mockOnlineSessions } from '../../mock/monitor.mock'

@Injectable()
export class OnlineService {
  constructor(private readonly tokenStore: TokenStoreService) {}

  list(query: Record<string, unknown>) {
    const sessions = this.tokenStore.listSessions()
    const source = sessions.length > 0
      ? sessions.map(session => ({
          tokenId: session.tokenId,
          userName: session.userName ?? `user-${session.userId}`,
          deptName: session.deptName ?? '--',
          ipaddr: session.ipaddr ?? '127.0.0.1',
          loginLocation: session.loginLocation ?? '内网',
          browser: session.browser ?? 'Unknown',
          os: session.os ?? 'Unknown',
          loginTime: this.formatDateTime(session.loginTime),
        }))
      : mockOnlineSessions

    const rows = source.filter((item) => {
      const matchesIp = !query.ipaddr || item.ipaddr.includes(String(query.ipaddr))
      const matchesUser = !query.userName || item.userName.includes(String(query.userName))
      return matchesIp && matchesUser
    })

    return table(rows, rows.length)
  }

  forceLogout(tokenId: string) {
    this.tokenStore.revokeToken(tokenId)
    return success(undefined, '强退成功')
  }

  private formatDateTime(value: unknown) {
    if (!value) {
      return ''
    }
    const date = value instanceof Date ? value : new Date(String(value))
    if (Number.isNaN(date.getTime())) {
      return String(value)
    }
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
}
