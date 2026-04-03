import { request } from '@/utils/request'

export function getServer() { return request<{ code: number, msg: string, data: any }>({ url: '/monitor/server', method: 'get' }) }

