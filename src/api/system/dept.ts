import { request } from '@/utils/request'


export function listDept(query?: Record<string, unknown>) { return request<{ code: number, msg: string, data: any[] }>({ url: '/system/dept/list', method: 'get', params: query }) }
export function getDept(deptId: string | number) { return request<{ code: number, msg: string, data: any }>({ url: `/system/dept/${deptId}`, method: 'get' }) }
export function listDeptExcludeChild(deptId: string | number) { return request<{ code: number, msg: string, data: any[] }>({ url: `/system/dept/list/exclude/${deptId}`, method: 'get' }) }
export function treeselect() { return request<{ code: number, msg: string, data: any[] }>({ url: '/system/dept/treeselect', method: 'get' }) }
export function roleDeptTreeselect(roleId: string | number) { return request<{ code: number, msg: string, data: any[] }>({ url: `/system/dept/roleDeptTreeselect/${roleId}`, method: 'get' }) }
export function addDept(data: Record<string, unknown>) { return request({ url: '/system/dept', method: 'post', data }) }
export function updateDept(data: Record<string, unknown>) { return request({ url: '/system/dept', method: 'put', data }) }
export function delDept(deptId: string | number) { return request({ url: `/system/dept/${deptId}`, method: 'delete' }) }

