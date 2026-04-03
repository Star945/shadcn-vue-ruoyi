import { request } from '@/utils/request'

export function listUser(query?: Record<string, unknown>) {
  return request<{ code: number, msg: string, rows: any[], total: number }>({ url: '/system/user/list', method: 'get', params: query })
}

export function getUser(userId?: string | number) {
  const suffix = userId === undefined || userId === null || userId === '' ? '' : String(userId)
  return request<any>({ url: `/system/user/${suffix}`, method: 'get' })
}

export function addUser(data: Record<string, unknown>) { return request({ url: '/system/user', method: 'post', data }) }
export function updateUser(data: Record<string, unknown>) { return request({ url: '/system/user', method: 'put', data }) }
export function delUser(userId: string | number) { return request({ url: `/system/user/${userId}`, method: 'delete' }) }
export function exportUser(query?: Record<string, unknown>) { return request<Blob>({ url: '/system/user/export', method: 'get', params: query, responseType: 'blob' }) }
export function resetUserPwd(userId: string | number, password: string) { return request({ url: '/system/user/resetPwd', method: 'put', data: { userId, password } }) }
export function changeUserStatus(userId: string | number, status: string) { return request({ url: '/system/user/changeStatus', method: 'put', data: { userId, status } }) }
export function getUserProfile() { return request<{ code: number, msg: string, data: any, roleGroup?: string, postGroup?: string, isDefaultModifyPwd?: boolean, isPasswordExpired?: boolean }>({ url: '/system/user/profile', method: 'get' }) }
export function updateUserProfile(data: Record<string, unknown>) { return request({ url: '/system/user/profile', method: 'put', data }) }
export function updateUserPwd(oldPassword: string, newPassword: string) { return request({ url: '/system/user/profile/updatePwd', method: 'put', data: { oldPassword, newPassword } }) }
export function uploadAvatar(data: FormData) { return request({ url: '/system/user/profile/avatar', method: 'post', data }) }
export function getAuthRole(userId: string | number) { return request<{ code: number, msg: string, data: any, user?: any, roles?: any[] }>({ url: `/system/user/authRole/${userId}`, method: 'get' }) }
export function updateAuthRole(data: Record<string, unknown>) { return request({ url: '/system/user/authRole', method: 'put', params: data }) }
export function deptTreeSelect() { return request<{ code: number, msg: string, data: any[] }>({ url: '/system/user/deptTree', method: 'get' }) }