import { request } from '@/utils/request'

export function listConfig(query?: Record<string, unknown>) { return request<{ code: number, msg: string, rows: any[], total: number }>({ url: '/system/config/list', method: 'get', params: query }) }
export function getConfig(configId: string | number) { return request<{ code: number, msg: string, data: any }>({ url: `/system/config/${configId}`, method: 'get' }) }
export function addConfig(data: Record<string, unknown>) { return request({ url: '/system/config', method: 'post', data }) }
export function updateConfig(data: Record<string, unknown>) { return request({ url: '/system/config', method: 'put', data }) }
export function delConfig(configId: string | number) { return request({ url: `/system/config/${configId}`, method: 'delete' }) }
export function exportConfig(query?: Record<string, unknown>) { return request<Blob>({ url: '/system/config/export', method: 'get', params: query, responseType: 'blob' }) }
export function refreshCache() { return request({ url: '/system/config/refreshCache', method: 'delete' }) }