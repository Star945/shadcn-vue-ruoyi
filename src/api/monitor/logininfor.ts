import { request } from '@/utils/request'

export function list(query?: Record<string, unknown>) { return request<{ code: number, msg: string, rows: any[], total: number }>({ url: '/monitor/logininfor/list', method: 'get', params: query }) }
export function unlockLogininfor(userName: string) { return request({ url: `/monitor/logininfor/unlock/${userName}`, method: 'get' }) }
export function delLogininfor(infoId: string | number) { return request({ url: `/monitor/logininfor/${infoId}`, method: 'delete' }) }
export function cleanLogininfor() { return request({ url: '/monitor/logininfor/clean', method: 'delete' }) }
export function exportLogininfor(query?: Record<string, unknown>) { return request<Blob>({ url: '/monitor/logininfor/export', method: 'get', params: query, responseType: 'blob' }) }
