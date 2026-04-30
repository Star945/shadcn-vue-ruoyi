import type { LucideIcon } from 'lucide-vue-next'

import {
  AppWindow,
  BellRing,
  BookMarked,
  BriefcaseBusiness,
  Code2,
  DatabaseZap,
  FileCog,
  FileSearch2,
  FolderTree,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  Logs,
  MonitorCog,
  MoonStar,
  Network,
  Palette,
  Search,
  ServerCog,
  Settings2,
  ShieldCheck,
  ShieldEllipsis,
  SlidersHorizontal,
  Sparkles,
  SunMedium,
  TimerReset,
  UserRound,
  Users,
  Waypoints,
} from 'lucide-vue-next'

export const iconMap = {
  'layout-dashboard': LayoutDashboard,
  users: Users,
  shield: ShieldCheck,
  'shield-ellipsis': ShieldEllipsis,
  'folder-tree': FolderTree,
  network: Network,
  briefcase: BriefcaseBusiness,
  book: BookMarked,
  sliders: SlidersHorizontal,
  bell: BellRing,
  'monitor-cog': MonitorCog,
  timer: TimerReset,
  logs: Logs,
  server: ServerCog,
  database: DatabaseZap,
  'app-window': AppWindow,
  sparkles: Sparkles,
  code: Code2,
  search: Search,
  user: UserRound,
  moon: MoonStar,
  sun: SunMedium,
  settings: Settings2,
  lock: LockKeyhole,
  key: KeyRound,
  file: FileCog,
  swagger: FileSearch2,
  palette: Palette,
  waypoints: Waypoints,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof iconMap

const menuIconAliases: Record<string, IconName> = {
  dashboard: 'layout-dashboard', monitor: 'monitor-cog', tool: 'app-window', system: 'sliders',
  peoples: 'users', user: 'user', role: 'shield', tree: 'folder-tree', 'tree-table': 'folder-tree',
  treeTable: 'folder-tree', dept: 'network', post: 'briefcase', dict: 'book', edit: 'sliders',
  message: 'bell', online: 'users', job: 'timer', log: 'logs', form: 'palette', build: 'palette',
  code: 'code', swagger: 'swagger', redis: 'database', 'redis-list': 'database',
  druid: 'monitor-cog', server: 'server', guide: 'app-window',
}

export function resolveIcon(name?: IconName): LucideIcon {
  return (name ? iconMap[name] : undefined) ?? LayoutDashboard
}

export function resolveMenuIcon(backendName?: string): IconName {
  const raw = (backendName ?? '').trim()
  if (!raw) return 'app-window'
  if (raw in menuIconAliases) return menuIconAliases[raw]
  if (raw in iconMap) return raw as IconName
  if (import.meta.env.DEV) {
    console.warn(`[icons] unmapped menu icon: "${raw}"`)
  }
  return 'app-window'
}
