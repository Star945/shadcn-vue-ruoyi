import { computed } from 'vue'
import { useRoute } from 'vue-router'

export interface BreadcrumbEntry {
  title: string
  path: string
}

export function useBreadcrumb() {
  const route = useRoute()

  const items = computed<BreadcrumbEntry[]>(() => {
    const entries: BreadcrumbEntry[] = []

    for (const record of route.matched) {
      const title = String(record.meta?.title ?? '').trim()
      if (!title || record.meta?.hidden || record.meta?.internal) continue
      if (record.path === '/') continue
      entries.push({ title, path: record.path })
    }

    if (route.meta?.hidden) {
      const routeTitle = String(route.meta.title ?? '').trim()
      if (routeTitle && entries.at(-1)?.title !== routeTitle) {
        entries.push({ title: routeTitle, path: route.path })
      }
    }

    if (!entries.length && route.path === '/index') {
      entries.push({ title: '工作台', path: '/index' })
    }

    return entries
  })

  return { items }
}
