import type { IconName } from '@/lib/icons'

import { defineStore } from 'pinia'

import { resolveMenuIcon } from '@/lib/icons'
import { type BackendRoute, isExternalValue, joinPath, normalizePath } from '@/lib/route-utils'
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

interface NavigationState {
  tree: NavigationNode[]
  localEntries: NavigationItem[]
  quickActions: NavigationItem[]
  titleMap: Record<string, string>
  loaded: boolean
  loading: boolean
}

const localEntries: NavigationItem[] = [
  { title: '工作台', path: '/index', icon: 'layout-dashboard' },
]

const quickActions: NavigationItem[] = [
  { title: '个人中心', path: '/user/profile', icon: 'user' },
  { title: '锁屏', path: '/lock', icon: 'lock' },
]

const quickActionGroupTitle = '快捷入口'

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
    const node: NavigationNode = { title, path, icon: resolveMenuIcon(route.meta?.icon), external, clickable, children }

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
    tree: [],
    localEntries,
    quickActions,
    titleMap: {},
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
        this.tree = built.tree
        this.titleMap = { ...createTitleMap(this.tree), ...built.titleMap }
        this.loaded = true
      }
      catch {
        this.tree = []
        this.titleMap = {}
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
