import { getToken, removeToken } from '@/utils/auth'

export interface RequestConfig {
  url: string
  method?: 'get' | 'post' | 'put' | 'delete'
  params?: Record<string, unknown>
  data?: unknown
  headers?: Record<string, string | number | boolean>
  timeout?: number
  responseType?: 'json' | 'text' | 'blob'
  handleUnauthorized?: boolean
}

export class RequestError extends Error {
  code?: number
  payload?: unknown

  constructor(message: string, code?: number, payload?: unknown) {
    super(message)
    this.name = 'RequestError'
    this.code = code
    this.payload = payload
  }
}

function buildUrl(url: string, params?: Record<string, unknown>) {
  if (!params || !Object.keys(params).length) {
    return url
  }
  const query = new URLSearchParams()
  for (const [key, rawValue] of Object.entries(params)) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      continue
    }
    if (Array.isArray(rawValue)) {
      rawValue.forEach(value => query.append(key, String(value)))
      continue
    }
    query.append(key, String(rawValue))
  }
  const queryString = query.toString()
  return queryString ? `${url}${url.includes('?') ? '&' : '?'}${queryString}` : url
}

function parseJsonSafely(rawText: string) {
  if (!rawText) {
    return undefined
  }
  try {
    return JSON.parse(rawText)
  }
  catch {
    return undefined
  }
}

function emitUnauthorized(message: string) {
  if (typeof window === 'undefined') {
    return
  }
  window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { message } }))
}

function buildUnauthorizedMessage(payload: any, fallback = '登录状态已过期，请重新登录') {
  return String(payload?.msg ?? payload?.message ?? fallback)
}

async function readBlobError(response: Response, blob: Blob, handleUnauthorized = true) {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.includes('application/json') && !contentType.includes('text/json')) {
    if (!response.ok) {
      throw new RequestError(response.statusText, response.status)
    }
    return
  }

  const rawText = await blob.text()
  const payload = parseJsonSafely(rawText) ?? { msg: rawText }
  const code = typeof payload?.code === 'number' ? payload.code : response.status

  if (response.status === 401 || code === 401) {
    removeToken()
    if (handleUnauthorized) {
      emitUnauthorized(buildUnauthorizedMessage(payload))
    }
    throw new RequestError(payload?.msg ?? '会话已过期', 401, payload)
  }

  if (!response.ok || code !== 200) {
    throw new RequestError(payload?.msg ?? response.statusText, code, payload)
  }
}

export async function request<T = any>(config: RequestConfig): Promise<T> {
  const method = (config.method ?? 'get').toUpperCase()
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), config.timeout ?? 10000)
  const customHeaders = config.headers ?? {}
  const headers = new Headers()
  const wantsToken = customHeaders.isToken !== false

  Object.entries(customHeaders).forEach(([key, value]) => {
    if (typeof value === 'boolean') {
      return
    }
    headers.set(key, String(value))
  })

  if (wantsToken) {
    const token = getToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const requestInit: RequestInit = {
    method,
    headers,
    signal: controller.signal,
  }

  if (config.data !== undefined && method !== 'GET') {
    if (config.data instanceof FormData) {
      requestInit.body = config.data
    }
    else {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json;charset=utf-8')
      }
      requestInit.body = JSON.stringify(config.data)
    }
  }

  try {
    const response = await fetch(buildUrl(`${import.meta.env.VITE_APP_BASE_API}${config.url}`, config.params), requestInit)
    if (config.responseType === 'blob') {
      const blob = await response.blob()
      await readBlobError(response, blob, config.handleUnauthorized !== false)
      return blob as T
    }
    const rawText = await response.text()
    const payload = rawText ? JSON.parse(rawText) : {}
    const code = typeof payload.code === 'number' ? payload.code : response.status

    if (response.status === 401 || code === 401) {
      removeToken()
      if (config.handleUnauthorized !== false) {
        emitUnauthorized(buildUnauthorizedMessage(payload))
      }
      throw new RequestError(payload.msg ?? '会话已过期', 401, payload)
    }

    if (!response.ok || code !== 200) {
      throw new RequestError(payload.msg ?? response.statusText, code, payload)
    }

    return payload as T
  }
  catch (error) {
    if (error instanceof RequestError) {
      throw error
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new RequestError('请求超时')
    }
    throw new RequestError(error instanceof Error ? error.message : '请求失败')
  }
  finally {
    clearTimeout(timeout)
  }
}

export const requestList = request