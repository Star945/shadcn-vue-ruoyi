// 若依后端不同版本的 path/component 写法不完全一致，先在这一层统一归一，避免菜单、路由守卫、面包屑各自写一套规则。
const exactPathAliases: Record<string, string> = {
  '/system/log/logininfor': '/monitor/logininfor',
  '/system/log/operlog': '/monitor/operlog',
  '/monitor/cachelist': '/monitor/cacheList',
  '/monitor/cache/list': '/monitor/cacheList',
  '/system/user/profile': '/user/profile',
  '/system/user/profile/index': '/user/profile',
}

const patternPathAliases = [
  {
    pattern: /^\/system\/user\/profile(?:\/index)?(?:\/([^/]+))?$/,
    resolve: (matched: RegExpMatchArray) => matched[1] ? `/user/profile/${matched[1]}` : '/user/profile',
  },
  {
    pattern: /^\/system\/user\/authRole(?:\/index)?\/(\d+)$/,
    resolve: (matched: RegExpMatchArray) => `/system/user-auth/role/${matched[1]}`,
  },
  {
    pattern: /^\/system\/role\/authUser(?:\/index)?\/(\d+)$/,
    resolve: (matched: RegExpMatchArray) => `/system/role-auth/user/${matched[1]}`,
  },
  {
    pattern: /^\/system\/(?:dict-data|dict\/data|dictData)(?:\/index)?\/(\d+)$/,
    resolve: (matched: RegExpMatchArray) => `/system/dict-data/index/${matched[1]}`,
  },
  {
    pattern: /^\/monitor\/(?:job-log|job\/log|jobLog)(?:\/index)?\/(\d+)$/,
    resolve: (matched: RegExpMatchArray) => `/monitor/job-log/index/${matched[1]}`,
  },
  {
    pattern: /^\/tool\/gen(?:-edit|\/editTable)(?:\/index)?\/(\d+)$/,
    resolve: (matched: RegExpMatchArray) => `/tool/gen-edit/index/${matched[1]}`,
  },
] satisfies Array<{
  pattern: RegExp
  resolve: (matched: RegExpMatchArray) => string
}>

const backendComponentPathMap: Record<string, string> = {
  index: '/index',
  'index/index': '/index',
  'ai/chat': '/aiChat',
  'ai/chat/index': '/aiChat',
  'system/user': '/system/user',
  'system/user/index': '/system/user',
  'system/role': '/system/role',
  'system/role/index': '/system/role',
  'system/menu': '/system/menu',
  'system/menu/index': '/system/menu',
  'system/dept': '/system/dept',
  'system/dept/index': '/system/dept',
  'system/post': '/system/post',
  'system/post/index': '/system/post',
  'system/dict': '/system/dict',
  'system/dict/index': '/system/dict',
  'system/dict/data': '/system/dict-data/index/:dictId(\\d+)',
  'system/dict/data/index': '/system/dict-data/index/:dictId(\\d+)',
  'system/config': '/system/config',
  'system/config/index': '/system/config',
  'system/notice': '/system/notice',
  'system/notice/index': '/system/notice',
  'system/user/profile': '/user/profile/:activeTab?',
  'system/user/profile/index': '/user/profile/:activeTab?',
  'system/user/authRole': '/system/user-auth/role/:userId(\\d+)',
  'system/user/authRole/index': '/system/user-auth/role/:userId(\\d+)',
  'system/role/authUser': '/system/role-auth/user/:roleId(\\d+)',
  'system/role/authUser/index': '/system/role-auth/user/:roleId(\\d+)',
  'monitor/online': '/monitor/online',
  'monitor/online/index': '/monitor/online',
  'monitor/job': '/monitor/job',
  'monitor/job/index': '/monitor/job',
  'monitor/job/log': '/monitor/job-log/index/:jobId(\\d+)',
  'monitor/job/log/index': '/monitor/job-log/index/:jobId(\\d+)',
  'monitor/jobLog': '/monitor/job-log/index/:jobId(\\d+)',
  'monitor/jobLog/index': '/monitor/job-log/index/:jobId(\\d+)',
  'monitor/logininfor': '/monitor/logininfor',
  'monitor/logininfor/index': '/monitor/logininfor',
  'system/log/logininfor': '/monitor/logininfor',
  'system/log/logininfor/index': '/monitor/logininfor',
  'monitor/operlog': '/monitor/operlog',
  'monitor/operlog/index': '/monitor/operlog',
  'system/log/operlog': '/monitor/operlog',
  'system/log/operlog/index': '/monitor/operlog',
  'monitor/server': '/monitor/server',
  'monitor/server/index': '/monitor/server',
  'monitor/cache': '/monitor/cache',
  'monitor/cache/index': '/monitor/cache',
  'monitor/cache/list': '/monitor/cacheList',
  'monitor/cache/list/index': '/monitor/cacheList',
  'monitor/cacheList': '/monitor/cacheList',
  'monitor/cacheList/index': '/monitor/cacheList',
  'monitor/druid': '/monitor/druid',
  'monitor/druid/index': '/monitor/druid',
  'tool/build': '/tool/build',
  'tool/build/index': '/tool/build',
  'tool/gen': '/tool/gen',
  'tool/gen/index': '/tool/gen',
  'tool/gen/editTable': '/tool/gen-edit/index/:tableId(\\d+)',
  'tool/gen/editTable/index': '/tool/gen-edit/index/:tableId(\\d+)',
  'tool/swagger': '/tool/swagger',
  'tool/swagger/index': '/tool/swagger',
}

export function normalizeBackendPath(path: string) {
  if (!path) {
    return '/index'
  }
  const normalized = path.startsWith('/') ? path : `/${path}`
  return normalized.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
}

export function canonicalizeBackendRoutePath(path: string) {
  const normalized = normalizeBackendPath(path)
  const exactMatch = exactPathAliases[normalized]
  if (exactMatch) {
    return exactMatch
  }

  for (const alias of patternPathAliases) {
    const matched = normalized.match(alias.pattern)
    if (matched) {
      return normalizeBackendPath(alias.resolve(matched))
    }
  }

  if (normalized !== '/index' && normalized.endsWith('/index')) {
    return canonicalizeBackendRoutePath(normalized.slice(0, -'/index'.length))
  }

  return normalized
}

export function resolveRawBackendRoutePath(parentPath: string, path?: string) {
  if (!path || path === '/') {
    return parentPath || '/'
  }
  if (path.startsWith('/')) {
    return normalizeBackendPath(path)
  }
  if (!parentPath || parentPath === '/') {
    return normalizeBackendPath(path)
  }
  return normalizeBackendPath(`${parentPath}/${path}`)
}

export function resolveBackendComponentPath(component?: string) {
  if (!component) {
    return ''
  }
  const normalizedComponent = component.replace(/^\/+|\/+$/g, '')
  return backendComponentPathMap[normalizedComponent] ?? ''
}

// 优先信任 component 映射，只在无法匹配时再回退到 path 拼接，这样更接近若依动态路由的真实语义。
export function resolveCanonicalBackendRoutePath(path?: string, component?: string, parentPath = '') {
  const componentPath = resolveBackendComponentPath(component)
  if (componentPath) {
    return canonicalizeBackendRoutePath(componentPath)
  }
  return canonicalizeBackendRoutePath(resolveRawBackendRoutePath(parentPath, path))
}

