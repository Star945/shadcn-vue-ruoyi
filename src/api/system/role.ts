import { request } from '@/utils/request'

export function listRole(query?: Record<string, unknown>) { return request<{ code: number, msg: string, rows: any[], total: number }>({ url: '/system/role/list', method: 'get', params: query }) }
export function getRole(roleId: string | number) { return request<any>({ url: `/system/role/${roleId}`, method: 'get' }) }
export function addRole(data: Record<string, unknown>) { return request({ url: '/system/role', method: 'post', data }) }
export function updateRole(data: Record<string, unknown>) { return request({ url: '/system/role', method: 'put', data }) }
export function dataScope(data: Record<string, unknown>) { return request({ url: '/system/role/dataScope', method: 'put', data }) }
export function changeRoleStatus(roleId: string | number, status: string) { return request({ url: '/system/role/changeStatus', method: 'put', data: { roleId, status } }) }
export function delRole(roleId: string | number) { return request({ url: `/system/role/${roleId}`, method: 'delete' }) }
export function exportRole(query?: Record<string, unknown>) { return request<Blob>({ url: '/system/role/export', method: 'get', params: query, responseType: 'blob' }) }
export function allocatedUserList(query?: Record<string, unknown>) { return request<{ code: number, msg: string, rows: any[], total: number }>({ url: '/system/role/authUser/allocatedList', method: 'get', params: query }) }
export function unallocatedUserList(query?: Record<string, unknown>) { return request<{ code: number, msg: string, rows: any[], total: number }>({ url: '/system/role/authUser/unallocatedList', method: 'get', params: query }) }
export function authUserCancel(data: Record<string, unknown>) { return request({ url: '/system/role/authUser/cancel', method: 'put', data }) }
export function authUserCancelAll(data: Record<string, unknown>) { return request({ url: '/system/role/authUser/cancelAll', method: 'put', params: data }) }
export function authUserSelectAll(data: Record<string, unknown>) { return request({ url: '/system/role/authUser/selectAll', method: 'put', params: data }) }
export function deptTreeSelect(roleId: string | number) { return request<any>({ url: `/system/role/deptTree/${roleId}`, method: 'get' }) }