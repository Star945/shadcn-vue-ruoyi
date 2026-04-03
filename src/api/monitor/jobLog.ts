import { request } from '@/utils/request'

export function listJobLog(query?: Record<string, unknown>) { return request<{ code: number, msg: string, rows: any[], total: number }>({ url: '/monitor/jobLog/list', method: 'get', params: query }) }
export function delJobLog(jobLogId: string | number) { return request({ url: `/monitor/jobLog/${jobLogId}`, method: 'delete' }) }
export function cleanJobLog() { return request({ url: '/monitor/jobLog/clean', method: 'delete' }) }
export function exportJobLog(query?: Record<string, unknown>) { return request<Blob>({ url: '/monitor/jobLog/export', method: 'get', params: query, responseType: 'blob' }) }
