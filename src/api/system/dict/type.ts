import { request } from '@/utils/request'

export function listType(query?: Record<string, unknown>) { return request<{ code: number, msg: string, rows: any[], total: number }>({ url: '/system/dict/type/list', method: 'get', params: query }) }
export function getType(dictId: string | number) { return request<{ code: number, msg: string, data: any }>({ url: `/system/dict/type/${dictId}`, method: 'get' }) }
export function addType(data: Record<string, unknown>) { return request({ url: '/system/dict/type', method: 'post', data }) }
export function updateType(data: Record<string, unknown>) { return request({ url: '/system/dict/type', method: 'put', data }) }
export function delType(dictId: string | number) { return request({ url: `/system/dict/type/${dictId}`, method: 'delete' }) }
export function exportType(query?: Record<string, unknown>) { return request<Blob>({ url: '/system/dict/type/export', method: 'get', params: query, responseType: 'blob' }) }
export function refreshCache() { return request({ url: '/system/dict/type/refreshCache', method: 'delete' }) }
export function optionselect() { return request<{ code: number, msg: string, data: any[] }>({ url: '/system/dict/type/optionselect', method: 'get' }) }