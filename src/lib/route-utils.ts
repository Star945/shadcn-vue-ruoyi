export interface BackendRoute {
  name?: string
  path?: string
  hidden?: boolean
  component?: string
  alwaysShow?: boolean
  redirect?: string
  children?: BackendRoute[]
  meta?: {
    title?: string
    icon?: string
    noCache?: boolean
    link?: string | null
  }
}

export function normalizePath(path: string) {
  if (!path) return '/'
  const p = path.startsWith('/') ? path : `/${path}`
  return p.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
}

export function joinPath(parent: string, child?: string) {
  if (!child || child === '/') return parent || '/'
  if (child.startsWith('/')) return normalizePath(child)
  if (!parent || parent === '/') return normalizePath(child)
  return normalizePath(`${parent}/${child}`)
}

export function isExternalValue(value?: string | null) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}
