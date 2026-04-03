import { request } from '@/utils/request'

export function listPost(query?: Record<string, unknown>) { return request<{ code: number, msg: string, rows: any[], total: number }>({ url: '/system/post/list', method: 'get', params: query }) }
export function getPost(postId: string | number) { return request<{ code: number, msg: string, data: any }>({ url: `/system/post/${postId}`, method: 'get' }) }
export function addPost(data: Record<string, unknown>) { return request({ url: '/system/post', method: 'post', data }) }
export function updatePost(data: Record<string, unknown>) { return request({ url: '/system/post', method: 'put', data }) }
export function delPost(postId: string | number) { return request({ url: `/system/post/${postId}`, method: 'delete' }) }
export function exportPost(query?: Record<string, unknown>) { return request<Blob>({ url: '/system/post/export', method: 'get', params: query, responseType: 'blob' }) }
export function optionselect() { return request<{ code: number, msg: string, data: any[] }>({ url: '/system/post/optionselect', method: 'get' }) }