import { request } from '@/utils/request'

export function listNotice(query?: Record<string, unknown>) { return request<{ code: number, msg: string, rows: any[], total: number }>({ url: '/system/notice/list', method: 'get', params: query }) }
export function getNotice(noticeId: string | number) { return request<{ code: number, msg: string, data: any }>({ url: `/system/notice/${noticeId}`, method: 'get' }) }
export function addNotice(data: Record<string, unknown>) { return request({ url: '/system/notice', method: 'post', data }) }
export function updateNotice(data: Record<string, unknown>) { return request({ url: '/system/notice', method: 'put', data }) }
export function delNotice(noticeId: string | number) { return request({ url: `/system/notice/${noticeId}`, method: 'delete' }) }
export function listNoticeTop() { return request<{ code: number, msg: string, data?: any[], unreadCount?: number }>({ url: '/system/notice/listTop', method: 'get' }) }
export function markNoticeRead(noticeId: string | number) { return request({ url: '/system/notice/markRead', method: 'post', params: { noticeId } }) }
export function markNoticeReadAll(ids: string) { return request({ url: '/system/notice/markReadAll', method: 'post', params: { ids } }) }