import { request } from '@/utils/request'

export function list(query?: Record<string, unknown>) { return request<{ code: number, msg: string, rows: any[], total: number }>({ url: '/monitor/online/list', method: 'get', params: query }) }
export function forceLogout(tokenId: string) { return request({ url: `/monitor/online/${tokenId}`, method: 'delete' }) }

