import { Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'

export interface SessionPayload {
  userId: number
  userName?: string
  deptName?: string
  ipaddr?: string
  loginLocation?: string
  browser?: string
  os?: string
  loginTime?: string
}

export interface SessionMeta extends SessionPayload {
  tokenId: string
}

@Injectable()
export class TokenStoreService {
  private readonly sessionMap = new Map<string, SessionMeta>()

  issue(payload: number | SessionPayload) {
    const token = `ruoyi-${randomUUID()}`
    const session = typeof payload === 'number'
      ? {
          tokenId: token,
          userId: payload,
          loginTime: new Date().toISOString(),
        }
      : {
          tokenId: token,
          ...payload,
          loginTime: payload.loginTime || new Date().toISOString(),
        }

    this.sessionMap.set(token, session)
    return token
  }

  resolveUserId(authorization?: string) {
    return this.resolveSession(authorization)?.userId
  }

  resolveSession(authorization?: string) {
    const token = this.extractToken(authorization)
    return token ? this.sessionMap.get(token) : undefined
  }

  listSessions() {
    return Array.from(this.sessionMap.values()).sort((left, right) => String(right.loginTime ?? '').localeCompare(String(left.loginTime ?? '')))
  }

  revoke(authorization?: string) {
    const token = this.extractToken(authorization)
    if (token) {
      this.sessionMap.delete(token)
    }
  }

  revokeToken(tokenId: string) {
    this.sessionMap.delete(tokenId)
  }

  private extractToken(authorization?: string) {
    if (!authorization) {
      return undefined
    }
    return authorization.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : authorization.trim()
  }
}
