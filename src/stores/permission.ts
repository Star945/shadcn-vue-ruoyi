import type { RouteRecordRaw, Router } from 'vue-router'

import { defineStore } from 'pinia'

import AdminLayout from '@/layout/AdminLayout.vue'
import ParentView from '@/layout/ParentView.vue'
import { permissionKeys } from '@/lib/permission-keys'
import { getRouters } from '@/api/menu'
import { useSessionStore } from '@/stores/session'

const viewModules = import.meta.glob('../views/**/*.vue')

function resolveViewModule(component: string) {
  const normalized = component.replace(/^\/+|\/+$/g, '')
  const candidates = [
    `../views/${normalized}.vue`,
    `../views/${normalized}/index.vue`,
  ]
  for (const key of candidates) {
    if (viewModules[key]) {
      return viewModules[key]
    }
  }
  return undefined
}

interface BackendRoute {
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

function normalizePath(path: string) {
  if (!path) return '/'
  const p = path.startsWith('/') ? path : `/${path}`
  return p.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
}

function joinPath(parent: string, child?: string) {
  if (!child || child === '/') return parent || '/'
  if (child.startsWith('/')) return normalizePath(child)
  if (!parent || parent === '/') return normalizePath(child)
  return normalizePath(`${parent}/${child}`)
}

function generateRouteName(path: string) {
  return path
    .replace(/^\//, '')
    .replace(/\/:/g, '_')
    .replace(/[/:()\\]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/_$/, '')
    || 'Index'
}

function isExternalValue(value?: string | null) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

function filterAsyncRouter(routes: BackendRoute[], parentPath = ''): RouteRecordRaw[] {
  return routes.reduce<RouteRecordRaw[]>((result, route) => {
    const externalLink = String(route.meta?.link ?? route.path ?? '').trim()
    if (isExternalValue(externalLink)) {
      return result
    }

    const fullPath = joinPath(parentPath, route.path)
    const children = route.children?.length ? filterAsyncRouter(route.children, fullPath) : []

    if (route.component === 'Layout' && fullPath === '/') {
      result.push(...children)
      return result
    }

    const record: RouteRecordRaw = {
      path: route.path?.startsWith('/') ? route.path : (route.path || ''),
      name: route.name || generateRouteName(fullPath),
      meta: {
        title: route.meta?.title ?? '',
        icon: route.meta?.icon ?? '',
        noCache: route.meta?.noCache ?? false,
        link: route.meta?.link ?? null,
        hidden: route.hidden ?? false,
      },
      children: [],
    } as RouteRecordRaw

    if (route.component === 'Layout') {
      record.component = AdminLayout
      if (route.redirect && route.redirect !== 'noRedirect') {
        record.redirect = route.redirect
      }
    }
    else if (route.component === 'ParentView') {
      record.component = ParentView
    }
    else if (route.component) {
      const viewModule = resolveViewModule(route.component)
      if (viewModule) {
        record.component = viewModule
      }
    }

    if (route.children?.length) {
      record.children = children
    }

    result.push(record)
    return result
  }, [])
}

function collectRootLayoutChildren(routes: BackendRoute[]) {
  return routes.flatMap((route) => {
    const fullPath = joinPath('', route.path)
    if (route.component === 'Layout' && fullPath === '/') {
      return Array.isArray(route.children) ? route.children : []
    }
    return []
  })
}

function collectStandaloneRoutes(routes: BackendRoute[]) {
  return routes.filter((route) => {
    const fullPath = joinPath('', route.path)
    return !(route.component === 'Layout' && fullPath === '/')
  })
}

const dynamicRoutes: RouteRecordRaw[] = [
  {
    path: '/system/user-auth/role/:userId(\\d+)',
    name: 'AuthRole',
    component: () => import('@/views/system/user/authRole.vue'),
    meta: { title: '分配角色', hidden: true, activeMenu: '/system/user', permission: permissionKeys.system.user.edit },
  },
  {
    path: '/system/role-auth/user/:roleId(\\d+)',
    name: 'AuthUser',
    component: () => import('@/views/system/role/authUser.vue'),
    meta: { title: '分配用户', hidden: true, activeMenu: '/system/role', permission: permissionKeys.system.role.edit },
  },
  {
    path: '/system/dict-data/index/:dictId(\\d+)',
    name: 'DictData',
    component: () => import('@/views/system/dict/data.vue'),
    meta: { title: '字典数据', hidden: true, activeMenu: '/system/dict', permission: permissionKeys.system.dict.list },
  },
  {
    path: '/monitor/job-log/index/:jobId(\\d+)',
    name: 'MonitorJobLog',
    component: () => import('@/views/monitor/job/log.vue'),
    meta: { title: '调度日志', hidden: true, activeMenu: '/monitor/job', permission: permissionKeys.monitor.job.list },
  },
  {
    path: '/tool/gen-edit/index/:tableId(\\d+)',
    name: 'ToolGenEdit',
    component: () => import('@/views/tool/gen/editTable.vue'),
    meta: { title: '编辑生成配置', hidden: true, activeMenu: '/tool/gen', permission: permissionKeys.tool.gen.edit },
  },
]

function hasPermission(permissions: string[], required: unknown) {
  if (!required) return true
  const keys = Array.isArray(required) ? required.map(String).filter(Boolean) : [String(required)]
  if (!keys.length) return true
  return keys.some(key => permissions.includes(key))
}

function filterDynamicRoutes(routes: RouteRecordRaw[], roles: string[], permissions: string[]) {
  if (roles.includes('admin') || permissions.includes(permissionKeys.superAdmin)) {
    return [...routes]
  }
  return routes.filter(route => hasPermission(permissions, route.meta?.permission))
}

export const usePermissionStore = defineStore('permission', {
  state: () => ({
    routes: [] as RouteRecordRaw[],
    sidebarRouters: [] as BackendRoute[],
    addedRouteNames: [] as string[],
    routesGenerated: false,
  }),
  actions: {
    async generateRoutes(routerInstance: Router) {
      const session = useSessionStore()
      let backendRoutes: BackendRoute[] = []
      try {
        const response = await getRouters()
        backendRoutes = Array.isArray(response.data) ? response.data : []
      }
      catch {
        backendRoutes = []
      }

      this.sidebarRouters = backendRoutes

      const rootLayoutChildren = collectRootLayoutChildren(backendRoutes)
      const standaloneRoutes = collectStandaloneRoutes(backendRoutes)
      const rootChildRoutes = filterAsyncRouter(rootLayoutChildren, '/')
      const asyncRoutes = filterAsyncRouter(standaloneRoutes)
      const permittedDynamic = filterDynamicRoutes(dynamicRoutes, session.roles, session.permissions)

      const addedNames: string[] = []

      for (const route of rootChildRoutes) {
        routerInstance.addRoute('AdminLayout', route)
        if (route.name) addedNames.push(String(route.name))
      }

      for (const route of asyncRoutes) {
        routerInstance.addRoute(route)
        if (route.name) addedNames.push(String(route.name))
      }

      for (const route of permittedDynamic) {
        routerInstance.addRoute('AdminLayout', route)
        if (route.name) addedNames.push(String(route.name))
      }

      const notFoundRoute: RouteRecordRaw = {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@/views/error/404.vue'),
        meta: { title: '页面不存在', public: true, hidden: true },
      }
      routerInstance.addRoute(notFoundRoute)
      addedNames.push('NotFound')

      this.addedRouteNames = addedNames
      this.routes = [...asyncRoutes, ...permittedDynamic]
      this.routesGenerated = true
    },

    resetRoutes(routerInstance: Router) {
      for (const name of this.addedRouteNames) {
        if (routerInstance.hasRoute(name)) {
          routerInstance.removeRoute(name)
        }
      }
      this.routes = []
      this.sidebarRouters = []
      this.addedRouteNames = []
      this.routesGenerated = false
    },
  },
})
