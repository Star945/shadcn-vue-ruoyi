import { request } from '@/utils/request'

export interface LoginResponse {
  code: number
  msg: string
  token: string
}

export interface CaptchaResponse {
  code: number
  msg: string
  captchaEnabled: boolean
  img?: string
  uuid?: string
}

export interface UserInfoResponse {
  code: number
  msg: string
  user: Record<string, any>
  roles: string[]
  permissions: string[]
  roleGroup?: string
  postGroup?: string
  isDefaultModifyPwd?: boolean
  isPasswordExpired?: boolean
}

export function login(username: string, password: string, code?: string, uuid?: string) {
  return request<LoginResponse>({
    url: '/login',
    method: 'post',
    headers: { isToken: false },
    data: { username, password, code, uuid },
  })
}

export function register(data: Record<string, unknown>) {
  return request({ url: '/register', method: 'post', headers: { isToken: false }, data })
}

export function getInfo() {
  return request<UserInfoResponse>({ url: '/getInfo', method: 'get' })
}

export function logout() {
  return request({ url: '/logout', method: 'post', handleUnauthorized: false })
}

export function getCodeImg() {
  return request<CaptchaResponse>({ url: '/captchaImage', method: 'get', headers: { isToken: false }, timeout: 20000 })
}

export function unlockScreen(password: string) {
  return request({ url: '/unlockscreen', method: 'post', data: { password } })
}
