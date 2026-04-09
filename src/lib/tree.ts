export interface FlatTreeNode<T> {
  id: string
  label: string
  depth: number
  raw: T
  parentId: string | null
  hasChildren: boolean
  expanded?: boolean
}

export interface TreeResolverOptions<T> {
  getId: (node: T) => string | number
  getLabel: (node: T) => string
  getChildren?: (node: T) => T[] | undefined
}

export interface BuildTreeFromFlatOptions<T> extends TreeResolverOptions<T> {
  getParentId?: (node: T) => string | number | null | undefined
}

function resolveChildren<T>(node: T, options: TreeResolverOptions<T>) {
  const getChildren = options.getChildren ?? ((item: T) => (item as { children?: T[] }).children)
  return getChildren(node) ?? []
}

function normalizeTreeId(value: string | number | null | undefined) {
  if (value === undefined || value === null || value === '') {
    return null
  }
  return String(value)
}

export function buildTreeFromFlat<T extends Record<string, any>>(
  nodes: T[],
  options: BuildTreeFromFlatOptions<T>,
) {
  if (!nodes.length) {
    return []
  }

  const getParentId = options.getParentId ?? ((node: T) => (node as { parentId?: string | number | null }).parentId)
  const nodeIds = new Set(nodes.map(node => String(options.getId(node))))
  const hasNestedChildren = nodes.some(node => resolveChildren(node, options).length > 0)
  const hasParentRefsInsideList = nodes.some((node) => {
    const id = String(options.getId(node))
    const parentId = normalizeTreeId(getParentId(node))
    return !!parentId && parentId !== '0' && parentId !== id && nodeIds.has(parentId)
  })

  // Some fallback APIs return a flat list while parent rows still keep stale children arrays.
  // In that hybrid case we must rebuild from parentId, otherwise tree rows render twice.
  if (hasNestedChildren && !hasParentRefsInsideList) {
    return nodes
  }

  const clones = new Map<string, T & { children?: T[] }>()
  const roots: Array<T & { children?: T[] }> = []

  nodes.forEach((node) => {
    const clone = { ...node, children: [] as T[] }
    clones.set(String(options.getId(node)), clone)
  })

  nodes.forEach((node) => {
    const id = String(options.getId(node))
    const current = clones.get(id)
    if (!current) {
      return
    }

    const parentId = normalizeTreeId(getParentId(node))
    if (!parentId || parentId === '0' || parentId === id) {
      roots.push(current)
      return
    }

    const parent = clones.get(parentId)
    if (!parent) {
      roots.push(current)
      return
    }

    parent.children ??= []
    parent.children.push(current)
  })

  clones.forEach((node) => {
    if (!node.children?.length) {
      delete node.children
    }
  })

  return roots
}

export function flattenTree<T>(
  nodes: T[],
  options: TreeResolverOptions<T>,
  depth = 0,
  parentId: string | null = null,
): FlatTreeNode<T>[] {
  return nodes.flatMap((node) => {
    const id = String(options.getId(node))
    const children = resolveChildren(node, options)
    const current: FlatTreeNode<T> = {
      id,
      label: options.getLabel(node),
      depth,
      raw: node,
      parentId,
      hasChildren: children.length > 0,
    }
    return [current, ...flattenTree(children, options, depth + 1, id)]
  })
}

export function collectTreeBranchIds<T>(nodes: T[], options: TreeResolverOptions<T>) {
  return flattenTree(nodes, options)
    .filter(node => node.hasChildren)
    .map(node => node.id)
}

export function flattenVisibleTree<T>(
  nodes: T[],
  options: TreeResolverOptions<T>,
  expandedIds: Iterable<string> = [],
  depth = 0,
  parentId: string | null = null,
): FlatTreeNode<T>[] {
  const expandedSet = expandedIds instanceof Set ? expandedIds : new Set(Array.from(expandedIds, item => String(item)))

  return nodes.flatMap((node) => {
    const id = String(options.getId(node))
    const children = resolveChildren(node, options)
    const expanded = children.length > 0 && expandedSet.has(id)
    const current: FlatTreeNode<T> = {
      id,
      label: options.getLabel(node),
      depth,
      raw: node,
      parentId,
      hasChildren: children.length > 0,
      expanded,
    }

    if (!expanded) {
      return [current]
    }

    return [current, ...flattenVisibleTree(children, options, expandedSet, depth + 1, id)]
  })
}

export function buildDateRangeParams(beginTime?: string, endTime?: string) {
  return {
    ...(beginTime ? { 'params[beginTime]': beginTime } : {}),
    ...(endTime ? { 'params[endTime]': endTime } : {}),
  }
}

export function toArray<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value
  }
  return value === undefined || value === null ? [] : [value]
}
