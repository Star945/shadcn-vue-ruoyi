import { RouterMenu } from '../mock/ruoyi.mock'

interface MenuNode {
  menuId: number
  parentId: number
  menuName: string
  path: string
  component?: string | null
  routeName?: string | null
  visible: string
  icon?: string | null
  isCache: number
  isFrame: number
  menuType: string
  orderNum: number
}

export function collectPermissions(menus: Array<{ perms?: string | null }>) {
  const permissions = new Set<string>()
  for (const menu of menus) {
    const raw = String(menu.perms ?? '').trim()
    if (!raw) {
      continue
    }
    raw.split(',').map(item => item.trim()).filter(Boolean).forEach(item => permissions.add(item))
  }
  return [...permissions]
}

export function buildRouterTree(menus: MenuNode[]): RouterMenu[] {
  const routeMenus = menus
    .filter(menu => menu.menuType === 'M' || menu.menuType === 'C')
    .sort((a, b) => a.orderNum - b.orderNum)

  const childrenMap = new Map<number, MenuNode[]>()
  for (const menu of routeMenus) {
    const siblings = childrenMap.get(menu.parentId) ?? []
    siblings.push(menu)
    childrenMap.set(menu.parentId, siblings)
  }

  const roots = childrenMap.get(0) ?? []
  return roots.map(menu => toRoute(menu, childrenMap))
}

function toRoute(menu: MenuNode, childrenMap: Map<number, MenuNode[]>): RouterMenu {
  const children = (childrenMap.get(menu.menuId) ?? []).sort((a, b) => a.orderNum - b.orderNum).map(child => toRoute(child, childrenMap))
  const externalLink = /^https?:/i.test(menu.path)
  const isDirectory = menu.menuType === 'M'
  const isRoot = menu.parentId === 0
  const component = isRoot
    ? 'Layout'
    : isDirectory
      ? (menu.component?.trim() || 'ParentView')
      : (menu.component?.trim() || '')

  return {
    name: menu.routeName?.trim() || buildRouteName(menu),
    path: normalizeRoutePath(menu.path, isRoot),
    hidden: menu.visible !== '0',
    redirect: children.length ? 'noRedirect' : undefined,
    component,
    alwaysShow: children.length ? true : undefined,
    meta: {
      title: menu.menuName,
      icon: menu.icon || undefined,
      noCache: Number(menu.isCache ?? 0) === 1,
      link: externalLink ? menu.path : null,
    },
    children: children.length ? children : undefined,
  }
}

function normalizeRoutePath(path: string, isRoot: boolean) {
  if (!path) {
    return isRoot ? '/' : ''
  }
  if (isRoot && !path.startsWith('/')) {
    return `/${path}`
  }
  return path
}

function buildRouteName(menu: MenuNode) {
  const source = menu.path || menu.menuName || `menu-${menu.menuId}`
  return source
    .replace(/^\/+/, '')
    .split(/[\/:-]+/)
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('') || `Menu${menu.menuId}`
}
