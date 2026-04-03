import { request } from '@/utils/request'


export function listTable(query?: Record<string, unknown>) {
  return request<{ code: number, msg: string, rows: any[], total: number }>({ url: '/tool/gen/list', method: 'get', params: query })
}

export function listDbTable(query?: Record<string, unknown>) {
  return request<{ code: number, msg: string, rows: any[], total: number }>({ url: '/tool/gen/db/list', method: 'get', params: query })
}

export function getGenTable(tableId: string | number) {
  return request<{ code: number, msg: string, data: any }>({ url: `/tool/gen/${tableId}`, method: 'get' })
}

export function updateGenTable(data: Record<string, unknown>) {
  return request<{ code: number, msg: string }>({ url: '/tool/gen', method: 'put', data })
}

export function importTable(data: Record<string, unknown>) {
  return request<{ code: number, msg: string }>({ url: '/tool/gen/importTable', method: 'post', params: data })
}

export function createTable(data: Record<string, unknown>) {
  return request<{ code: number, msg: string }>({ url: '/tool/gen/createTable', method: 'post', params: data })
}

export function previewTable(tableId: string | number) {
  return request<{ code: number, msg: string, data: Record<string, string> }>({ url: `/tool/gen/preview/${tableId}`, method: 'get' })
}

export function delTable(tableId: string | number | string) {
  return request<{ code: number, msg: string }>({ url: `/tool/gen/${tableId}`, method: 'delete' })
}

export function genCode(tableName: string) {
  return request<{ code: number, msg: string }>({ url: `/tool/gen/genCode/${tableName}`, method: 'get' })
}

export function batchGenCode(tables: string) {
  return request<Blob>({ url: '/tool/gen/batchGenCode', method: 'get', params: { tables }, responseType: 'blob' })
}

export function synchDb(tableName: string) {
  return request<{ code: number, msg: string }>({ url: `/tool/gen/synchDb/${tableName}`, method: 'get' })
}

