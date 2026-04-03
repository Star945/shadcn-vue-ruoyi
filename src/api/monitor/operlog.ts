import { request } from '@/utils/request'

export function list(query?: Record<string, unknown>) { return request<{ code: number, msg: string, rows: any[], total: number }>({ url: '/monitor/operlog/list', method: 'get', params: query }) }
export function delOperlog(operId: string | number) { return request({ url: `/monitor/operlog/${operId}`, method: 'delete' }) }
export function cleanOperlog() { return request({ url: '/monitor/operlog/clean', method: 'delete' }) }
export function exportOperlog(query?: Record<string, unknown>) { return request<Blob>({ url: '/monitor/operlog/export', method: 'get', params: query, responseType: 'blob' }) }
