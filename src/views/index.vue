<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'

import type { AdminTableColumn } from '@/components/admin/data-table'
import type { NavigationItem } from '@/stores/navigation'

import { list as listLogininfor } from '@/api/monitor/logininfor'
import { list as listOnline } from '@/api/monitor/online'
import { list as listOperlog } from '@/api/monitor/operlog'
import { getServer } from '@/api/monitor/server'
import { listJob } from '@/api/monitor/job'
import { listNoticeTop } from '@/api/system/notice'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import DashboardChart from '@/components/app/DashboardChart.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  lastUpdated: '最后刷新',
  refresh: '刷新看板',
  enterSystem: '进入系统',
  viewMonitor: '监控',
  partialLoadFailed: '部分内容加载失败',
  partialLoadSuffix: '其余内容已显示。',
  refreshSuccess: '工作台已刷新',
  separator: '、',
  metricOnline: '在线会话',
  metricOnlineDetail: '在线账号 ',
  metricOnlineBadge: '实时',
  metricOnlineLink: '会话',
  metricJob: '定时任务',
  metricJobDetailPrefix: '正常 ',
  metricJobDetailSuffix: '停用 ',
  metricJobLink: '任务',
  metricNotice: '未读公告',
  metricNoticeDetail: '通知中心 ',
  metricNoticeLink: '公告',
  metricServer: 'CPU 使用率',
  metricServerDetail: '内存使用率 ',
  metricServerLink: '监控',
  metricStableBadge: '稳定',
  metricAttentionBadge: '关注',
  metricEmptyBadge: '已接通',
  quickLinksTitle: '快捷入口',
  quickLinksDescription: '常用入口',
  quickLinkFallback: '立即进入。',
  quickUser: '用户与账号。',
  quickRole: '角色与授权。',
  quickMenu: '菜单与导航。',
  quickJob: '任务运行与记录。',
  quickServer: '服务与资源状态。',
  quickGen: '生成配置与代码。',
  quickOpen: '进入',
  noticeBoardTitle: '通知公告',
  noticeBoardDescription: '最新公告',
  noticeBoardAction: '公告管理',
  noticeLoading: '正在加载公告...',
  noticeEmpty: '暂无公告数据',
  noticeUnread: '未读',
  noticeTypeNotice: '通知',
  noticeTypeBulletin: '公告',
  runtimeTitle: '运行概览',
  runtimeDescription: '资源概览',
  serverHost: '服务器名称',
  serverOs: '操作系统',
  serverCpu: 'CPU',
  serverCpuCore: '核',
  serverMemory: '系统内存',
  serverJvm: 'JVM',
  serverRisk: '风险提示',
  loginFailedShort: '登录失败 ',
  operExceptionShort: '异常操作 ',
  loginActivityTitle: '最近登录动态',
  loginActivityDescription: '最近登录',
  operActivityTitle: '最近操作日志',
  operActivityDescription: '最近操作',
  statusSuccess: '成功',
  statusFailure: '失败',
  statusNormal: '正常',
  statusException: '异常',
  loginEmpty: '暂无登录动态',
  operEmpty: '暂无操作日志',
  loginLoading: '正在加载登录动态...',
  operLoading: '正在加载操作日志...',
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
  '/system/user': copy.quickUser,
  '/system/role': copy.quickRole,
  '/system/menu': copy.quickMenu,
  '/monitor/job': copy.quickJob,
  '/monitor/server': copy.quickServer,
  '/tool/gen': copy.quickGen,
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

// 负载趋势演示数据
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

function noticeTypeText(value: string) {
  return value === '1' ? copy.noticeTypeNotice : copy.noticeTypeBulletin
}

function noticeTypeVariant(value: string) {
  return value === '1' ? 'secondary' : 'outline'
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

function formatTimeStamp() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

function quickLinkDescription(path: string) {
  return quickLinkDescriptions[path] ?? copy.quickLinkFallback
}

const recentNotices = computed(() => notices.value.slice(0, 5))

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
      detail: `${copy.metricOnlineDetail}${formatCount(onlineTotal.value)}`,
      badge: copy.metricOnlineBadge,
      tone: 'outline',
      path: '/monitor/online',
      linkText: copy.metricOnlineLink,
    },
    {
      key: 'job',
      label: copy.metricJob,
      value: formatCount(jobTotal.value),
      detail: `${copy.metricJobDetailPrefix}${formatCount(jobEnabledTotal.value)} / ${copy.metricJobDetailSuffix}${formatCount(pausedJobs)}`,
      badge: jobTotal.value ? copy.metricStableBadge : copy.metricEmptyBadge,
      tone: jobTotal.value ? 'secondary' : 'outline',
      path: '/monitor/job',
      linkText: copy.metricJobLink,
    },
    {
      key: 'notice',
      label: copy.metricNotice,
      value: formatCount(unreadNoticeTotal.value),
      detail: `${copy.metricNoticeDetail}${formatCount(notices.value.length)}`,
      badge: unreadNoticeTotal.value ? copy.metricAttentionBadge : copy.metricStableBadge,
      tone: unreadNoticeTotal.value ? 'destructive' : 'outline',
      path: '/system/notice',
      linkText: copy.metricNoticeLink,
    },
    {
      key: 'server',
      label: copy.metricServer,
      value: formatPercent(server.value.cpu?.used),
      detail: `${copy.metricServerDetail}${memUsage}`,
      badge: cpuUsed > 80 ? copy.metricAttentionBadge : copy.metricStableBadge,
      tone: cpuUsed > 80 ? 'destructive' : 'outline',
      path: '/monitor/server',
      linkText: copy.metricServerLink,
    },
  ]
})

const runtimeItems = computed(() => [
  { label: copy.serverHost, value: server.value.sys?.computerName || '--' },
  { label: copy.serverOs, value: server.value.sys?.osName || '--' },
  { label: copy.serverCpu, value: `${formatPercent(server.value.cpu?.used)} / ${copy.serverCpuCore}${formatCount(server.value.cpu?.cpuNum)}` },
  { label: copy.serverMemory, value: `${formatPercent(server.value.mem?.usage)} / ${formatUnit(server.value.mem?.used, 'G')} / ${formatUnit(server.value.mem?.total, 'G')}` },
  { label: copy.serverJvm, value: `${formatPercent(server.value.jvm?.usage)} / ${formatUnit(server.value.jvm?.used, 'M')} / ${formatUnit(server.value.jvm?.total, 'M')}` },
  { label: copy.serverRisk, value: `${copy.loginFailedShort}${formatCount(loginFailedCount.value)} / ${copy.operExceptionShort}${formatCount(operExceptionCount.value)}` },
])

async function loadDashboard(silent = false) {
  loading.value = true
  const navigationTask = navigation.ensureLoaded()
  const sections = [
    { key: 'notice', label: copy.noticeBoardTitle, task: listNoticeTop() },
    { key: 'online', label: copy.metricOnline, task: listOnline() },
    { key: 'jobAll', label: copy.metricJob, task: listJob({ pageNum: 1, pageSize: 1 }) },
    { key: 'jobEnabled', label: copy.metricJob, task: listJob({ pageNum: 1, pageSize: 1, status: '0' }) },
    { key: 'server', label: copy.runtimeTitle, task: getServer() },
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
    <div>
      <div>
        <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">{{ copy.eyebrow }}</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight">{{ copy.title }}</h1>

        <p class="mt-2 text-xs text-muted-foreground">{{ copy.lastUpdated }} {{ lastUpdated || '--' }}</p>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card
        v-for="(metric, index) in metricCards"
        :key="metric.key"
        class="group animate-in fade-in slide-in-from-bottom-2 border-white/60 bg-white/75 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/5"
        :style="{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }"
      >
        <CardHeader class="pb-3">
          <div class="flex items-center justify-between gap-3">
            <CardTitle class="text-sm font-medium text-muted-foreground">{{ metric.label }}</CardTitle>
            <Badge :variant="metricVariant(metric.tone)">{{ metric.badge }}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div v-if="loading && metric.value === '--'" class="space-y-3">
            <div>
              <Skeleton class="h-9 w-24" />
              <Skeleton class="mt-2 h-5 w-48" />
            </div>
            <div>
              <Skeleton class="h-8 w-16" />
            </div>
          </div>
          <div v-else class="space-y-3">
            <div>
              <p class="text-3xl font-semibold tracking-tight">{{ metric.value }}</p>
              <p class="mt-2 text-sm text-muted-foreground">{{ metric.detail }}</p>
            </div>
            <div>
              <Button as-child variant="ghost" size="sm" class="-ml-2 px-2">
                <RouterLink :to="metric.path">{{ metric.linkText }}</RouterLink>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <AdminSectionCard title="实时负载趋势" description="近一小时">
      <template #headerExtra>
        <Button variant="outline" size="sm" :disabled="loading" @click="loadDashboard()">{{ copy.refresh }}</Button>
      </template>
      <div v-if="loading && !server.cpu" class="h-[240px] flex items-center justify-center rounded-3xl border border-dashed bg-muted/10">
        <Skeleton class="mx-6 h-[200px] w-full" />
      </div>
      <DashboardChart v-else :data="loadTrendData" :labels="loadTrendLabels" />
    </AdminSectionCard>

    <div class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <AdminSectionCard :title="copy.noticeBoardTitle" :description="copy.noticeBoardDescription">
        <template #headerExtra>
          <Button as-child variant="outline" size="sm"><RouterLink to="/system/notice">{{ copy.noticeBoardAction }}</RouterLink></Button>
        </template>

        <div v-if="loading && !recentNotices.length" class="text-sm text-muted-foreground">{{ copy.noticeLoading }}</div>
        <div v-else-if="!recentNotices.length" class="text-sm text-muted-foreground">{{ copy.noticeEmpty }}</div>
        <div v-else class="grid gap-3">
          <div
            v-for="item in recentNotices"
            :key="item.noticeId"
            class="rounded-3xl border px-4 py-4"
            :class="item.isRead ? 'border-border/60 bg-muted/15' : 'border-primary/20 bg-primary/5'"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <Badge :variant="noticeTypeVariant(item.noticeType)">{{ noticeTypeText(item.noticeType) }}</Badge>
                  <span v-if="!item.isRead" class="text-xs font-medium text-primary">{{ copy.noticeUnread }}</span>
                </div>
                <p class="mt-3 truncate text-sm font-semibold">{{ item.noticeTitle }}</p>
                <p class="mt-1 text-xs text-muted-foreground">{{ item.createTime || '--' }}</p>
              </div>
            </div>
          </div>
        </div>
      </AdminSectionCard>

      <div class="grid gap-6">
        <AdminSectionCard :title="copy.quickLinksTitle" :description="copy.quickLinksDescription">
          <template #headerExtra>
            <Button as-child size="sm"><RouterLink to="/system/user">{{ copy.enterSystem }}</RouterLink></Button>
          </template>
          <div class="grid gap-3">
            <RouterLink
              v-for="item in quickLinks"
              :key="item.path"
              :to="item.path"
              class="rounded-3xl border border-border/60 bg-muted/20 px-4 py-4 transition hover:border-border hover:bg-muted/35"
            >
              <div class="flex items-start gap-3">
                <div class="mt-0.5 flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <component :is="resolveIcon(item.icon)" class="size-4" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-sm font-semibold">{{ item.title }}</p>
                    <Badge variant="outline">{{ copy.quickOpen }}</Badge>
                  </div>
                  <p class="mt-1 text-sm leading-6 text-muted-foreground">{{ quickLinkDescription(item.path) }}</p>
                </div>
              </div>
            </RouterLink>
          </div>
        </AdminSectionCard>

        <AdminSectionCard :title="copy.runtimeTitle" :description="copy.runtimeDescription">
          <template #headerExtra>
            <Button as-child variant="outline" size="sm"><RouterLink to="/monitor/server">{{ copy.viewMonitor }}</RouterLink></Button>
          </template>
          <div class="grid gap-3">
            <div v-for="item in runtimeItems" :key="item.label" class="rounded-3xl border border-border/60 bg-muted/20 px-4 py-4">
              <p class="text-sm text-muted-foreground">{{ item.label }}</p>
              <p class="mt-2 text-sm font-semibold leading-6">{{ item.value }}</p>
            </div>
          </div>
        </AdminSectionCard>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
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
            <Badge :variant="String(row.status) === '0' ? 'default' : 'destructive'">
              {{ monitorResultLabel(row.status) }}
            </Badge>
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
            <Badge :variant="String(row.status) === '0' ? 'default' : 'destructive'">
              {{ monitorOperStatusLabel(row.status) }}
            </Badge>
          </template>
        </AdminDataTable>
      </AdminSectionCard>
    </div>
  </div>
</template>


























