import { request } from '@/utils/request'


export function listMenu(query?: Record<string, unknown>) { return request<{ code: number, msg: string, data: any[] }>({ url: '/system/menu/list', method: 'get', params: query }) }
export function getMenu(menuId: string | number) { return request<{ code: number, msg: string, data: any }>({ url: `/system/menu/${menuId}`, method: 'get' }) }
export function treeselect() { return request<{ code: number, msg: string, data: any[] }>({ url: '/system/menu/treeselect', method: 'get' }) }
export function roleMenuTreeselect(roleId: string | number) { return request<any>({ url: `/system/menu/roleMenuTreeselect/${roleId}`, method: 'get' }) }
export function addMenu(data: Record<string, unknown>) { return request({ url: '/system/menu', method: 'post', data }) }
export function updateMenu(data: Record<string, unknown>) { return request({ url: '/system/menu', method: 'put', data }) }
export function updateMenuSort(data: Record<string, unknown>) { return request({ url: '/system/menu/updateSort', method: 'put', data }) }
export function delMenu(menuId: string | number) { return request({ url: `/system/menu/${menuId}`, method: 'delete' }) }

