import { request } from '@/utils/request'

export function listData(query?: Record<string, unknown>) { return request<{ code: number, msg: string, rows: any[], total: number }>({ url: '/system/dict/data/list', method: 'get', params: query }) }
export function getData(dictCode: string | number) { return request<{ code: number, msg: string, data: any }>({ url: `/system/dict/data/${dictCode}`, method: 'get' }) }
export function addData(data: Record<string, unknown>) { return request({ url: '/system/dict/data', method: 'post', data }) }
export function updateData(data: Record<string, unknown>) { return request({ url: '/system/dict/data', method: 'put', data }) }
export function delData(dictCode: string | number) { return request({ url: `/system/dict/data/${dictCode}`, method: 'delete' }) }
export function exportData(query?: Record<string, unknown>) { return request<Blob>({ url: '/system/dict/data/export', method: 'get', params: query, responseType: 'blob' }) }