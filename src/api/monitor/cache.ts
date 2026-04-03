import { request } from '@/utils/request'


export function getCache() {
  return request<{ code: number, msg: string, data: any }>({ url: '/monitor/cache', method: 'get' })
}

export function listCacheName() {
  return request<{ code: number, msg: string, data: any[] }>({ url: '/monitor/cache/getNames', method: 'get' })
}

export function listCacheKey(cacheName: string) {
  return request<{ code: number, msg: string, data: any[] }>({ url: `/monitor/cache/getKeys/${encodeURIComponent(cacheName)}`, method: 'get' })
}

export function getCacheValue(cacheName: string, cacheKey: string) {
  return request<{ code: number, msg: string, data: any }>({ url: `/monitor/cache/getValue/${encodeURIComponent(cacheName)}/${encodeURIComponent(cacheKey)}`, method: 'get' })
}

export function clearCacheName(cacheName: string) {
  return request<{ code: number, msg: string }>({ url: `/monitor/cache/clearCacheName/${encodeURIComponent(cacheName)}`, method: 'delete' })
}

export function clearCacheKey(cacheKey: string) {
  return request<{ code: number, msg: string }>({ url: `/monitor/cache/clearCacheKey/${encodeURIComponent(cacheKey)}`, method: 'delete' })
}

export function clearCacheAll() {
  return request<{ code: number, msg: string }>({ url: '/monitor/cache/clearCacheAll', method: 'delete' })
}


