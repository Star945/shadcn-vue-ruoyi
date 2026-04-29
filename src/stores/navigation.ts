import type { IconName } from '@/lib/icons'

import { defineStore } from 'pinia'

import { usePermissionStore } from '@/stores/permission'

export interface NavigationItem {
  title: string
  path: string
  icon: IconName
  external?: boolean
}

export interface NavigationNode extends NavigationItem {
  children: NavigationNode[]
  clickable: boolean
}

interface BackendRoute {
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

interface NavigationState {
  tree: NavigationNode[]
  localEntries: NavigationItem[]
  quickActions: NavigationItem[]
  titleMap: Record<string, string>
  loaded: boolean
  loading: boolean
}

const fallbackTree: NavigationNode[] = [
  {
    title: '系统管理', path: '/system', icon: 'sliders', clickable: false,
    children: [
      { title: '用户管理', path: '/system/user', icon: 'users', clickable: true, children: [] },
      { title: '角色管理', path: '/system/role', icon: 'shield', clickable: true, children: [] },
      { title: '菜单管理', path: '/system/menu', icon: 'folder-tree', clickable: true, children: [] },
      { title: '部门管理', path: '/system/dept', icon: 'network', clickable: true, children: [] },
      { title: '岗位管理', path: '/system/post', icon: 'briefcase', clickable: true, children: [] },
      { title: '字典管理', path: '/system/dict', icon: 'book', clickable: true, children: [] },
      { title: '参数设置', path: '/system/config', icon: 'sliders', clickable: true, children: [] },
      { title: '通知公告', path: '/system/notice', icon: 'bell', clickable: true, children: [] },
    ],
  },
  {
    title: '系统监控', path: '/monitor', icon: 'monitor-cog', clickable: false,
    children: [
      { title: '在线用户', path: '/monitor/online', icon: 'users', clickable: true, children: [] },
      { title: '定时任务', path: '/monitor/job', icon: 'timer', clickable: true, children: [] },
      { title: '登录日志', path: '/monitor/logininfor', icon: 'logs', clickable: true, children: [] },
      { title: '操作日志', path: '/monitor/operlog', icon: 'shield-ellipsis', clickable: true, children: [] },
      { title: '服务监控', path: '/monitor/server', icon: 'server', clickable: true, children: [] },
      { title: '缓存监控', path: '/monitor/cache', icon: 'database', clickable: true, children: [] },
      { title: '缓存列表', path: '/monitor/cacheList', icon: 'database', clickable: true, children: [] },
      { title: '数据监控', path: '/monitor/druid', icon: 'monitor-cog', clickable: true, children: [] },
    ],
  },
  {
    title: '系统工具', path: '/tool', icon: 'app-window', clickable: false,
    children: [
      { title: '表单构建', path: '/tool/build', icon: 'palette', clickable: true, children: [] },
      { title: '代码生成', path: '/tool/gen', icon: 'code', clickable: true, children: [] },
      { title: '系统接口', path: '/tool/swagger', icon: 'swagger', clickable: true, children: [] },
    ],
  },
]

const localEntries: NavigationItem[] = [
  { title: '工作台', path: '/index', icon: 'layout-dashboard' },
]

const quickActions: NavigationItem[] = [
  { title: '个人中心', path: '/user/profile', icon: 'user' },
  { title: '锁屏', path: '/lock', icon: 'lock' },
]

const quickActionGroupTitle = '快捷入口'

const iconAliases: Record<string, IconName> = {
  dashboard: 'layout-dashboard', monitor: 'monitor-cog', tool: 'app-window', system: 'sliders',
  peoples: 'users', user: 'user', role: 'shield', tree: 'folder-tree', 'tree-table': 'folder-tree',
  treeTable: 'folder-tree', dept: 'network', post: 'briefcase', dict: 'book', edit: 'sliders',
  message: 'bell', online: 'users', job: 'timer', log: 'logs', form: 'palette', build: 'palette',
  code: 'code', swagger: 'swagger', redis: 'database', 'redis-list': 'database',
  druid: 'monitor-cog', server: 'server', guide: 'app-window',
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

function isExternalValue(value: string) {
  return /^https?:\/\//i.test(value)
}

function iconFromPath(path: string): IconName {
  if (path === '/index') return 'layout-dashboard'
  if (path.startsWith('/system/user')) return 'users'
  if (path.startsWith('/system/role')) return 'shield'
  if (path.startsWith('/system/menu')) return 'folder-tree'
  if (path.startsWith('/system/dept')) return 'network'
  if (path.startsWith('/system/post')) return 'briefcase'
  if (path.startsWith('/system/dict')) return 'book'
  if (path.startsWith('/system/config')) return 'sliders'
  if (path.startsWith('/system/notice')) return 'bell'
  if (path.startsWith('/monitor/job')) return 'timer'
  if (path.startsWith('/monitor/server')) return 'server'
  if (path.startsWith('/monitor/cache')) return 'database'
  if (path.startsWith('/monitor')) return 'monitor-cog'
  if (path.startsWith('/tool/build')) return 'palette'
  if (path.startsWith('/tool/gen')) return 'code'
  if (path.startsWith('/tool/swagger')) return 'swagger'
  return 'app-window'
}

function iconOf(route: BackendRoute, path: string): IconName {
  const raw = String(route.meta?.icon ?? '').trim()
  if (raw && raw in iconAliases) return iconAliases[raw]
  return iconFromPath(path)
}

function titleOf(route: BackendRoute) {
  return String(route.meta?.title ?? '').trim()
}

function dedupeNodes(nodes: NavigationNode[]) {
  const seen = new Set<string>()
  return nodes.reduce<NavigationNode[]>((acc, node) => {
    const key = `${node.title}::${node.path}`
    if (seen.has(key)) return acc
    seen.add(key)
    acc.push({ ...node, children: dedupeNodes(node.children) })
    return acc
  }, [])
}

function flattenClickableNodes(nodes: NavigationNode[], acc: NavigationItem[] = []) {
  nodes.forEach((node) => {
    if (node.clickable) acc.push({ title: node.title, path: node.path, icon: node.icon, external: node.external })
    if (node.children.length) flattenClickableNodes(node.children, acc)
  })
  return acc
}

function uniqueByPath(items: NavigationItem[]) {
  const seen = new Set<string>()
  return items.reduce<NavigationItem[]>((acc, item) => {
    const key = `${item.title}::${item.path}`
    if (seen.has(key)) return acc
    seen.add(key)
    acc.push(item)
    return acc
  }, [])
}

function findTrailInNodes(nodes: NavigationNode[], path: string, trail: NavigationNode[] = []): NavigationNode[] {
  const normalized = normalizePath(path)
  for (const node of nodes) {
    const nextTrail = [...trail, node]
    const childTrail = findTrailInNodes(node.children, normalized, nextTrail)
    if (childTrail.length) return childTrail
    if (!node.external && normalizePath(node.path) === normalized) return nextTrail
  }
  return []
}

function resolveFirstClickableNode(node: NavigationNode): NavigationItem | undefined {
  if (node.clickable) return { title: node.title, path: node.path, icon: node.icon, external: node.external }
  for (const child of node.children) {
    const matched = resolveFirstClickableNode(child)
    if (matched) return matched
  }
  return undefined
}

function createTitleMap(tree: NavigationNode[]) {
  return uniqueByPath([...localEntries, ...quickActions, ...flattenClickableNodes(tree)]).reduce<Record<string, string>>((map, item) => {
    map[item.path] = item.title
    return map
  }, {})
}

function buildTree(routes: BackendRoute[], parentPath = '', titleMap: Record<string, string> = {}) {
  const nodes: NavigationNode[] = []
  routes.forEach((route) => {
    const link = String(route.meta?.link ?? '').trim()
    const externalTarget = link || String(route.path ?? '').trim()
    const external = isExternalValue(externalTarget)
    const path = external ? externalTarget : joinPath(parentPath, route.path)
    const title = titleOf(route)
    const children = Array.isArray(route.children) ? buildTree(route.children, path, titleMap) : []

    if (title) titleMap[path] = title

    const isVisible = !route.hidden && Boolean(title)
    if (!isVisible) {
      nodes.push(...children)
      return
    }

    const containerOnly = route.component === 'Layout' || route.component === 'ParentView'
    const clickable = external || !containerOnly
    const node: NavigationNode = { title, path, icon: iconOf(route, path), external, clickable, children }

    if (!node.clickable && !node.children.length) return
    nodes.push(node)
  })
  return dedupeNodes(nodes)
}

function buildNavigation(routes: BackendRoute[]) {
  const titleMap: Record<string, string> = {}
  const tree = buildTree(routes, '', titleMap)
  return { tree, titleMap: { ...createTitleMap(tree), ...titleMap } }
}

export const useNavigationStore = defineStore('navigation', {
  state: (): NavigationState => ({
    tree: fallbackTree,
    localEntries,
    quickActions,
    titleMap: createTitleMap(fallbackTree),
    loaded: false,
    loading: false,
  }),
  getters: {
    allItems(state) {
      return uniqueByPath([...state.localEntries, ...flattenClickableNodes(state.tree)])
    },
    rootItems(state) {
      return state.tree
    },
  },
  actions: {
    async ensureLoaded(force = false) {
      if (this.loading || (this.loaded && !force)) return
      this.loading = true
      try {
        const permission = usePermissionStore()
        const backendRoutes = permission.sidebarRouters
        const built = buildNavigation(backendRoutes)
        this.tree = built.tree.length ? built.tree : fallbackTree
        this.titleMap = { ...createTitleMap(this.tree), ...built.titleMap }
        this.loaded = true
      }
      catch {
        this.tree = fallbackTree
        this.titleMap = createTitleMap(fallbackTree)
        this.loaded = true
      }
      finally {
        this.loading = false
      }
    },
    resolveTitle(path: string) {
      const normalized = normalizePath(path)
      return this.titleMap[normalized] ?? this.titleMap[path]
    },
    findTrail(path: string) {
      return findTrailInNodes(this.tree, path)
    },
    findRoot(path: string) {
      return this.findTrail(path)[0]
    },
    findItem(path: string) {
      const normalized = normalizePath(path)
      return [...this.allItems, ...this.quickActions].find((item) => {
        if (item.external) return item.path === path
        const np = normalizePath(item.path)
        return normalized === np || normalized.startsWith(`${np}/`)
      })
    },
    resolveNodeTarget(node: NavigationNode) {
      return resolveFirstClickableNode(node)
    },
    quickActionGroupTitle() {
      return quickActionGroupTitle
    },
  },
})
