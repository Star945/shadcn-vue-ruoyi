<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Activity, ArrowUpRight, BellRing, Clock3, Database, RefreshCw, Server, ShieldAlert, Users } from 'lucide-vue-next'

import type { AdminTableColumn } from '@/components/admin/data-table'
import type { NavigationItem } from '@/stores/navigation'

import { list as listLogininfor } from '@/api/monitor/logininfor'
import { list as listOnline } from '@/api/monitor/online'
import { list as listOperlog } from '@/api/monitor/operlog'
import { listJob } from '@/api/monitor/job'
import { getServer } from '@/api/monitor/server'
import { listNoticeTop } from '@/api/system/notice'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge.vue'
import DashboardChart from '@/components/app/DashboardChart.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveIcon } from '@/lib/icons'
import { monitorOperStatusLabel, monitorResultLabel } from '@/lib/monitor'
import { useNavigationStore } from '@/stores/navigation'

interface NoticeItem {
  noticeId: string | number
  noticeTitle: string
  noticeType: string
  createTime?: string
  isRead?: boolean
}

const copy = {
  eyebrow: '工作台',
  title: '工作台',
  summary: '把入口、运行态势和最近动态压在一屏里，减少切换成本。',
  lastUpdated: '最近同步',
  refresh: '刷新看板',
  enterSystem: '进入系统',
  openMonitor: '监控中心',
  partialLoadFailed: '部分内容加载失败',
  partialLoadSuffix: '其余内容已显示。',
  refreshSuccess: '工作台已刷新',
  separator: '、',
  metricOnline: '在线会话',
  metricJob: '定时任务',
  metricNotice: '未读公告',
  metricServer: 'CPU 负载',
  metricRealtime: '实时',
  metricStable: '稳定',
  metricAttention: '关注',
  metricConnected: '已接通',
  trendTitle: '运行态势',
  trendDescription: '把近一小时变化和关键资源脉冲放在一起。',
  quickLinksTitle: '快捷入口',
  quickLinksDescription: '常用入口',
  quickOpen: '进入',
  noticeBoardTitle: '最新公告',
  noticeBoardDescription: '通知与提醒',
  noticeBoardAction: '公告管理',
  noticeLoading: '正在加载公告...',
  noticeEmpty: '暂无公告',
  noticeUnread: '未读',
  noticeTypeNotice: '通知',
  noticeTypeBulletin: '公告',
  runtimeHost: '主机',
  runtimeOs: '系统',
  runtimeProject: '项目目录',
  runtimeRisk: '风险提示',
  pulseCpu: 'CPU 负载',
  pulseMemory: '系统内存',
  pulseJvm: 'JVM 内存',
  pulseRisk: '风险线索',
  riskLogin: '登录失败',
  riskOper: '异常操作',
  loginActivityTitle: '最近登录动态',
  loginActivityDescription: '最近登录',
  operActivityTitle: '最近操作日志',
  operActivityDescription: '最近操作',
  loginLoading: '正在加载登录动态...',
  operLoading: '正在加载操作日志...',
  loginEmpty: '暂无登录动态',
  operEmpty: '暂无操作日志',
  fieldUserName: '用户名称',
  fieldIpaddr: '登录地址',
  fieldLoginStatus: '登录状态',
  fieldLoginTime: '登录时间',
  fieldModule: '系统模块',
  fieldOperName: '操作人员',
  fieldOperStatus: '状态',
  fieldOperTime: '操作时间',
} as const

const loginColumns: AdminTableColumn[] = [
  { key: 'userName', title: copy.fieldUserName },
  { key: 'ipaddr', title: copy.fieldIpaddr },
  { key: 'status', title: copy.fieldLoginStatus, headerClass: 'text-center', cellClass: 'text-center' },
  { key: 'loginTime', title: copy.fieldLoginTime },
]

const operColumns: AdminTableColumn[] = [
  { key: 'title', title: copy.fieldModule },
  { key: 'operName', title: copy.fieldOperName },
  { key: 'status', title: copy.fieldOperStatus, headerClass: 'text-center', cellClass: 'text-center' },
  { key: 'operTime', title: copy.fieldOperTime },
]

const preferredQuickLinkPaths = [
  '/system/user',
  '/system/role',
  '/system/menu',
  '/monitor/job',
  '/monitor/server',
  '/tool/gen',
]

const quickLinkDescriptions: Record<string, string> = {
  '/system/user': '用户与账号',
  '/system/role': '角色与授权',
  '/system/menu': '菜单与导航',
  '/monitor/job': '任务与执行记录',
  '/monitor/server': '服务与资源状态',
  '/tool/gen': '代码生成与预览',
}

const navigation = useNavigationStore()

const loading = ref(false)
const onlineTotal = ref(0)
const jobTotal = ref(0)
const jobEnabledTotal = ref(0)
const unreadNoticeTotal = ref(0)
const notices = ref<NoticeItem[]>([])
const loginRows = ref<Record<string, any>[]>([])
const operRows = ref<Record<string, any>[]>([])
const server = ref<Record<string, any>>({})
const lastUpdated = ref('')

const loadTrendData = ref([45, 52, 48, 61, 55, 68, 72, 65, 59, 74, 82, 78])
const loadTrendLabels = ref(['10:00', '10:10', '10:20', '10:30', '10:40', '10:50', '11:00', '11:10', '11:20', '11:30', '11:40', '11:50'])

function normalizeNotice(item: Record<string, any>): NoticeItem {
  return {
    noticeId: item.noticeId,
    noticeTitle: String(item.noticeTitle ?? '--'),
    noticeType: String(item.noticeType ?? '1'),
    createTime: String(item.createTime ?? ''),
    isRead: Boolean(item.isRead),
  }
}

function toNumber(value: unknown, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function formatCount(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return '--'
  }
  return new Intl.NumberFormat('zh-CN').format(numeric)
}

function formatPercent(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? `${numeric}%` : '--'
}

function formatUnit(value: unknown, unit: string) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? `${numeric}${unit}` : '--'
}

function clampPercent(value: unknown, fallback = 0) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return fallback
  }
  return Math.max(0, Math.min(100, numeric))
}

function metricVariant(value: string) {
  if (value === 'destructive') {
    return 'destructive'
  }
  if (value === 'secondary') {
    return 'secondary'
  }
  return 'outline'
}

function progressClass(tone: 'default' | 'secondary' | 'destructive') {
  if (tone === 'destructive') {
    return 'bg-destructive'
  }
  if (tone === 'secondary') {
    return 'bg-emerald-500'
  }
  return 'bg-primary'
}

function noticeTypeText(value: string) {
  return value === '1' ? copy.noticeTypeNotice : copy.noticeTypeBulletin
}

function noticeTypeVariant(value: string) {
  return value === '1' ? 'secondary' : 'outline'
}

function formatTimeStamp() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

function quickLinkDescription(path: string) {
  return quickLinkDescriptions[path] ?? '立即进入'
}

const recentNotices = computed(() => notices.value.slice(0, 4))

const quickLinks = computed(() => {
  const allItems = navigation.allItems.filter(item => item.path !== '/index')
  const itemMap = new Map(allItems.map(item => [item.path, item]))
  const ordered = [
    ...preferredQuickLinkPaths.map(path => itemMap.get(path)),
    ...allItems,
  ]

  const seen = new Set<string>()
  return ordered.filter((item): item is NavigationItem => {
    if (!item || seen.has(item.path)) {
      return false
    }
    seen.add(item.path)
    return true
  }).slice(0, 6)
})

const loginFailedCount = computed(() => loginRows.value.filter(item => String(item.status) === '1').length)
const operExceptionCount = computed(() => operRows.value.filter(item => String(item.status) === '1').length)

const metricCards = computed(() => {
  const pausedJobs = Math.max(jobTotal.value - jobEnabledTotal.value, 0)
  const cpuUsed = toNumber(server.value.cpu?.used)
  const memUsage = formatPercent(server.value.mem?.usage)

  return [
    {
      key: 'online',
      label: copy.metricOnline,
      value: formatCount(onlineTotal.value),
      detail: `在线账号 ${formatCount(onlineTotal.value)}`,
      badge: copy.metricRealtime,
      tone: 'outline',
      path: '/monitor/online',
      linkText: '查看会话',
      icon: Users,
    },
    {
      key: 'job',
      label: copy.metricJob,
      value: formatCount(jobTotal.value),
      detail: `正常 ${formatCount(jobEnabledTotal.value)} · 停用 ${formatCount(pausedJobs)}`,
      badge: jobTotal.value ? copy.metricStable : copy.metricConnected,
      tone: jobTotal.value ? 'secondary' : 'outline',
      path: '/monitor/job',
      linkText: '查看任务',
      icon: Clock3,
    },
    {
      key: 'notice',
      label: copy.metricNotice,
      value: formatCount(unreadNoticeTotal.value),
      detail: `通知中心 ${formatCount(notices.value.length)} 条`,
      badge: unreadNoticeTotal.value ? copy.metricAttention : copy.metricStable,
      tone: unreadNoticeTotal.value ? 'destructive' : 'outline',
      path: '/system/notice',
      linkText: '查看公告',
      icon: BellRing,
    },
    {
      key: 'server',
      label: copy.metricServer,
      value: formatPercent(server.value.cpu?.used),
      detail: `内存 ${memUsage}`,
      badge: cpuUsed > 80 ? copy.metricAttention : copy.metricStable,
      tone: cpuUsed > 80 ? 'destructive' : 'secondary',
      path: '/monitor/server',
      linkText: '查看监控',
      icon: Activity,
    },
  ]
})

const resourcePulseItems = computed(() => {
  const cpuUsed = clampPercent(server.value.cpu?.used)
  const memUsage = clampPercent(server.value.mem?.usage)
  const jvmUsage = clampPercent(server.value.jvm?.usage)
  const riskCount = loginFailedCount.value + operExceptionCount.value

  return [
    {
      key: 'cpu',
      label: copy.pulseCpu,
      value: formatPercent(server.value.cpu?.used),
      hint: `${formatCount(server.value.cpu?.cpuNum)} 核 / 空闲 ${formatPercent(server.value.cpu?.free)}`,
      percent: cpuUsed,
      tone: cpuUsed > 80 ? 'destructive' : 'secondary',
      icon: Activity,
    },
    {
      key: 'memory',
      label: copy.pulseMemory,
      value: formatPercent(server.value.mem?.usage),
      hint: `${formatUnit(server.value.mem?.used, 'G')} / ${formatUnit(server.value.mem?.total, 'G')}`,
      percent: memUsage,
      tone: memUsage > 80 ? 'destructive' : 'default',
      icon: Database,
    },
    {
      key: 'jvm',
      label: copy.pulseJvm,
      value: formatPercent(server.value.jvm?.usage),
      hint: `${formatUnit(server.value.jvm?.used, 'M')} / ${formatUnit(server.value.jvm?.total, 'M')}`,
      percent: jvmUsage,
      tone: jvmUsage > 80 ? 'destructive' : 'default',
      icon: Server,
    },
    {
      key: 'risk',
      label: copy.pulseRisk,
      value: formatCount(riskCount),
      hint: `${copy.riskLogin} ${formatCount(loginFailedCount.value)} · ${copy.riskOper} ${formatCount(operExceptionCount.value)}`,
      percent: clampPercent(riskCount * 12),
      tone: riskCount ? 'destructive' : 'secondary',
      icon: ShieldAlert,
    },
  ] as const
})

const runtimeHighlights = computed(() => [
  { label: copy.runtimeHost, value: server.value.sys?.computerName || '--' },
  { label: copy.runtimeOs, value: server.value.sys?.osName || '--' },
  { label: copy.runtimeProject, value: server.value.sys?.userDir || '--' },
  { label: copy.runtimeRisk, value: `${copy.riskLogin} ${formatCount(loginFailedCount.value)} · ${copy.riskOper} ${formatCount(operExceptionCount.value)}` },
])

async function loadDashboard(silent = false) {
  loading.value = true
  const navigationTask = navigation.ensureLoaded()
  const sections = [
    { key: 'notice', label: copy.noticeBoardTitle, task: listNoticeTop() },
    { key: 'online', label: copy.metricOnline, task: listOnline() },
    { key: 'jobAll', label: copy.metricJob, task: listJob({ pageNum: 1, pageSize: 1 }) },
    { key: 'jobEnabled', label: copy.metricJob, task: listJob({ pageNum: 1, pageSize: 1, status: '0' }) },
    { key: 'server', label: copy.trendTitle, task: getServer() },
    { key: 'login', label: copy.loginActivityTitle, task: listLogininfor({ pageNum: 1, pageSize: 6 }) },
    { key: 'oper', label: copy.operActivityTitle, task: listOperlog({ pageNum: 1, pageSize: 6 }) },
  ] as const

  try {
    const results = await Promise.allSettled(sections.map(item => item.task))
    const failedLabels: string[] = []

    results.forEach((result, index) => {
      const key = sections[index].key
      if (result.status !== 'fulfilled') {
        failedLabels.push(sections[index].label)
        return
      }

      const value: any = result.value
      switch (key) {
        case 'notice': {
          const rows = Array.isArray(value.data) ? value.data.map((item: any) => normalizeNotice(item)) : []
          notices.value = rows
          unreadNoticeTotal.value = typeof value.unreadCount === 'number'
            ? value.unreadCount
            : rows.filter((item: NoticeItem) => !item.isRead).length
          break
        }
        case 'online': {
          const rows = Array.isArray(value.rows) ? value.rows : []
          onlineTotal.value = toNumber(value.total, rows.length)
          break
        }
        case 'jobAll': {
          jobTotal.value = toNumber(value.total)
          break
        }
        case 'jobEnabled': {
          jobEnabledTotal.value = toNumber(value.total)
          break
        }
        case 'server': {
          server.value = value.data ?? {}
          break
        }
        case 'login': {
          loginRows.value = Array.isArray(value.rows) ? value.rows : []
          break
        }
        case 'oper': {
          operRows.value = Array.isArray(value.rows) ? value.rows : []
          break
        }
      }
    })

    await navigationTask
    lastUpdated.value = formatTimeStamp()

    if (failedLabels.length) {
      if (!silent) {
        toast.error(copy.partialLoadFailed, {
          description: `${failedLabels.join(copy.separator)}${copy.partialLoadSuffix}`,
        })
      }
      return
    }

    if (!silent) {
      toast.success(copy.refreshSuccess)
    }
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDashboard(true)
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="admin-kicker">{{ copy.eyebrow }}</p>
        <h1 class="mt-3 text-3xl font-semibold tracking-tight sm:text-[2rem]">{{ copy.title }}</h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{{ copy.summary }}</p>
      </div>
      <div class="inline-flex w-full items-center justify-between gap-4 rounded-[26px] border border-border/60 bg-background/80 px-4 py-3 text-sm shadow-sm backdrop-blur lg:w-auto">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">{{ copy.lastUpdated }}</p>
          <p class="mt-1 font-medium text-foreground">{{ lastUpdated || '--' }}</p>
        </div>
        <Button variant="outline" size="sm" class="gap-1.5" :disabled="loading" @click="loadDashboard()">
          <RefreshCw class="size-3.5" />
          {{ copy.refresh }}
        </Button>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <div
        v-for="metric in metricCards"
        :key="metric.key"
        class="admin-shell-panel-strong rounded-[28px] px-5 py-5"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-start gap-3">
            <div class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <component :is="metric.icon" class="size-4.5" />
            </div>
            <div class="min-w-0">
              <p class="text-xs uppercase tracking-[0.16em] text-muted-foreground">{{ metric.label }}</p>
              <p class="mt-2 text-[1.75rem] font-semibold tracking-tight">{{ metric.value }}</p>
            </div>
          </div>
          <Badge :variant="metricVariant(metric.tone)">{{ metric.badge }}</Badge>
        </div>
        <p class="mt-3 text-sm text-muted-foreground">{{ metric.detail }}</p>
        <Button as-child variant="link" size="sm" class="-ml-1 mt-2 h-auto gap-1 px-1 text-xs font-semibold text-primary no-underline hover:no-underline">
          <RouterLink :to="metric.path">
            {{ metric.linkText }}
            <ArrowUpRight class="size-3.5" />
          </RouterLink>
        </Button>
      </div>
    </div>

    <AdminSectionCard
      :title="copy.trendTitle"
      :description="copy.trendDescription"
      card-class="overflow-hidden"
      content-class="space-y-6"
    >
      <div v-if="loading && !server.cpu" class="space-y-4">
        <Skeleton class="h-[280px] w-full rounded-[28px]" />
        <div class="grid gap-3 xl:grid-cols-4">
          <Skeleton v-for="index in 4" :key="index" class="h-28 w-full rounded-[24px]" />
        </div>
      </div>
      <div v-else class="space-y-6">
        <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div class="rounded-[28px] border border-border/60 bg-muted/12 p-4">
            <DashboardChart :data="loadTrendData" :labels="loadTrendLabels" height="288px" />
          </div>
          <div class="grid gap-3">
            <div
              v-for="item in resourcePulseItems"
              :key="item.key"
              class="rounded-[24px] border border-border/60 bg-background/85 px-4 py-4 shadow-sm"
            >
              <div class="flex items-start gap-3">
                <div class="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <component :is="item.icon" class="size-4" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-sm font-medium">{{ item.label }}</p>
                    <span class="text-sm font-semibold">{{ item.value }}</span>
                  </div>
                  <p class="mt-1 text-xs leading-5 text-muted-foreground">{{ item.hint }}</p>
                  <div class="mt-3 h-2 rounded-full bg-muted/40">
                    <div
                      class="h-2 rounded-full transition-all"
                      :class="progressClass(item.tone)"
                      :style="{ width: `${item.percent}%` }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div
            v-for="item in runtimeHighlights"
            :key="item.label"
            class="rounded-[24px] border border-border/60 bg-muted/12 px-4 py-4"
          >
            <p class="text-xs uppercase tracking-[0.16em] text-muted-foreground">{{ item.label }}</p>
            <p class="mt-2 break-all text-sm font-medium leading-6">{{ item.value }}</p>
          </div>
        </div>
      </div>
    </AdminSectionCard>

    <div class="grid gap-6 2xl:grid-cols-2">
      <AdminSectionCard :title="copy.quickLinksTitle" :description="copy.quickLinksDescription" card-class="overflow-hidden">
        <template #headerExtra>
          <Button as-child size="sm" class="gap-1.5">
            <RouterLink to="/system/user">{{ copy.enterSystem }}</RouterLink>
          </Button>
        </template>
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <RouterLink
            v-for="item in quickLinks"
            :key="item.path"
            :to="item.path"
            class="rounded-[24px] border border-border/60 bg-background/85 px-4 py-4 shadow-sm transition hover:-translate-y-[1px] hover:border-primary/25"
          >
            <div class="flex items-start gap-3">
              <div class="mt-0.5 flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <component :is="resolveIcon(item.icon)" class="size-4" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                  <p class="truncate text-sm font-semibold">{{ item.title }}</p>
                  <ArrowUpRight class="size-3.5 shrink-0 text-muted-foreground" />
                </div>
                <p class="mt-1 text-xs leading-5 text-muted-foreground">{{ quickLinkDescription(item.path) }}</p>
              </div>
            </div>
          </RouterLink>
        </div>
      </AdminSectionCard>

      <AdminSectionCard :title="copy.noticeBoardTitle" :description="copy.noticeBoardDescription">
        <template #headerExtra>
          <Button as-child variant="outline" size="sm">
            <RouterLink to="/system/notice">{{ copy.noticeBoardAction }}</RouterLink>
          </Button>
        </template>
        <div v-if="loading && !recentNotices.length" class="text-sm text-muted-foreground">{{ copy.noticeLoading }}</div>
        <div v-else-if="!recentNotices.length" class="text-sm text-muted-foreground">{{ copy.noticeEmpty }}</div>
        <div v-else class="grid gap-3">
          <div
            v-for="item in recentNotices"
            :key="item.noticeId"
            class="rounded-[24px] border px-4 py-4"
            :class="item.isRead ? 'border-border/60 bg-muted/10' : 'border-primary/20 bg-primary/5'"
          >
            <div class="flex items-start gap-3">
              <div class="mt-0.5 flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BellRing class="size-4" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <Badge :variant="noticeTypeVariant(item.noticeType)">{{ noticeTypeText(item.noticeType) }}</Badge>
                  <span v-if="!item.isRead" class="text-xs font-medium text-primary">{{ copy.noticeUnread }}</span>
                </div>
                <p class="mt-3 line-clamp-2 text-sm font-semibold leading-6">{{ item.noticeTitle }}</p>
                <p class="mt-1 text-xs text-muted-foreground">{{ item.createTime || '--' }}</p>
              </div>
            </div>
          </div>
        </div>
      </AdminSectionCard>
    </div>

    <div class="grid gap-6 2xl:grid-cols-2">
      <AdminSectionCard :title="copy.loginActivityTitle" :description="copy.loginActivityDescription">
        <AdminDataTable
          :columns="loginColumns"
          :rows="loginRows"
          row-key="infoId"
          :loading="loading"
          :loading-text="copy.loginLoading"
          :empty-text="copy.loginEmpty"
        >
          <template #cell-userName="{ value }">
            <span class="font-medium">{{ value || '--' }}</span>
          </template>
          <template #cell-status="{ row }">
            <AdminStatusBadge :label="monitorResultLabel(row.status)" />
          </template>
        </AdminDataTable>
      </AdminSectionCard>

      <AdminSectionCard :title="copy.operActivityTitle" :description="copy.operActivityDescription">
        <AdminDataTable
          :columns="operColumns"
          :rows="operRows"
          row-key="operId"
          :loading="loading"
          :loading-text="copy.operLoading"
          :empty-text="copy.operEmpty"
        >
          <template #cell-title="{ value }">
            <span class="font-medium">{{ value || '--' }}</span>
          </template>
          <template #cell-status="{ row }">
            <AdminStatusBadge :label="monitorOperStatusLabel(row.status)" />
          </template>
        </AdminDataTable>
      </AdminSectionCard>
    </div>
  </div>
</template>
