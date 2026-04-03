import { request } from '@/utils/request'

export function getRouters() {
  return request<any>({ url: '/getRouters', method: 'get' })
}

