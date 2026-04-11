<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Activity, Cpu, Database, HardDrive, RefreshCw, ShieldAlert } from 'lucide-vue-next'

import type { AdminTableColumn } from '@/components/admin/data-table'

import { getServer } from '@/api/monitor/server'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const diskColumns: AdminTableColumn[] = [
  { key: 'dirName', title: '磁盘路径' },
  { key: 'sysTypeName', title: '文件系统' },
  { key: 'typeName', title: '磁盘类型' },
  { key: 'total', title: '总大小' },
  { key: 'free', title: '可用大小' },
  { key: 'used', title: '已用大小' },
  { key: 'usage', title: '已用百分比', headerClass: 'text-center', cellClass: 'text-center' },
]

const loading = ref(false)
const server = ref<Record<string, any>>({})

function toNumber(value: unknown, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function clampPercent(value: unknown, fallback = 0) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return fallback
  }
  return Math.max(0, Math.min(100, numeric))
}

function usageVariant(value: unknown) {
  return Number(value ?? 0) > 80 ? 'destructive' : 'outline'
}

function progressClass(percent: number) {
  if (percent > 80) {
    return 'bg-destructive'
  }
  if (percent > 60) {
    return 'bg-amber-500'
  }
  return 'bg-primary'
}

const cpuItems = computed(() => {
  const cpu = server.value.cpu ?? {}
  return [
    { label: '核心数', value: cpu.cpuNum ?? '--' },
    { label: '用户使用率', value: cpu.used !== undefined ? `${cpu.used}%` : '--' },
    { label: '系统使用率', value: cpu.sys !== undefined ? `${cpu.sys}%` : '--' },
    { label: '当前空闲率', value: cpu.free !== undefined ? `${cpu.free}%` : '--' },
  ]
})

const memoryItems = computed(() => {
  const mem = server.value.mem ?? {}
  return [
    { label: '总内存', value: mem.total ? `${mem.total}G` : '--' },
    { label: '已用内存', value: mem.used ? `${mem.used}G` : '--' },
    { label: '剩余内存', value: mem.free ? `${mem.free}G` : '--' },
    { label: '内存使用率', value: mem.usage ? `${mem.usage}%` : '--' },
  ]
})

const jvmItems = computed(() => {
  const jvm = server.value.jvm ?? {}
  return [
    { label: 'JVM 总内存', value: jvm.total ? `${jvm.total}M` : '--' },
    { label: 'JVM 已用', value: jvm.used ? `${jvm.used}M` : '--' },
    { label: 'JVM 剩余', value: jvm.free ? `${jvm.free}M` : '--' },
    { label: 'JVM 使用率', value: jvm.usage ? `${jvm.usage}%` : '--' },
  ]
})

const systemItems = computed(() => {
  const sys = server.value.sys ?? {}
  return [
    { label: '服务器名称', value: sys.computerName ?? '--' },
    { label: '服务器 IP', value: sys.computerIp ?? '--' },
    { label: '操作系统', value: sys.osName ?? '--' },
    { label: '系统架构', value: sys.osArch ?? '--' },
  ]
})

const jvmDetailItems = computed(() => {
  const jvm = server.value.jvm ?? {}
  const sys = server.value.sys ?? {}
  return [
    { label: 'Java 名称', value: jvm.name ?? '--' },
    { label: 'Java 版本', value: jvm.version ?? '--' },
    { label: '启动时间', value: jvm.startTime ?? '--' },
    { label: '运行时长', value: jvm.runTime ?? '--' },
    { label: '安装路径', value: jvm.home ?? '--' },
    { label: '项目路径', value: sys.userDir ?? '--' },
    { label: '运行参数', value: jvm.inputArgs ?? '--' },
  ]
})

const diskRows = computed(() => Array.isArray(server.value.sysFiles) ? server.value.sysFiles : [])

const overviewCards = computed(() => {
  const cpu = server.value.cpu ?? {}
  const mem = server.value.mem ?? {}
  const jvm = server.value.jvm ?? {}
  const highestDiskUsage = diskRows.value.reduce((max, item) => Math.max(max, toNumber(item.usage)), 0)

  return [
    {
      label: 'CPU 负载',
      value: cpu.used !== undefined ? `${cpu.used}%` : '--',
      hint: `${cpu.cpuNum ?? '--'} 核心 / 空闲 ${cpu.free ?? '--'}%`,
      percent: clampPercent(cpu.used),
      icon: Cpu,
    },
    {
      label: '系统内存',
      value: mem.usage !== undefined ? `${mem.usage}%` : '--',
      hint: `${mem.used ?? '--'}G / ${mem.total ?? '--'}G`,
      percent: clampPercent(mem.usage),
      icon: Database,
    },
    {
      label: 'JVM 内存',
      value: jvm.usage !== undefined ? `${jvm.usage}%` : '--',
      hint: `${jvm.used ?? '--'}M / ${jvm.total ?? '--'}M`,
      percent: clampPercent(jvm.usage),
      icon: Activity,
    },
    {
      label: '磁盘分区',
      value: String(diskRows.value.length),
      hint: `最高占用 ${highestDiskUsage || 0}%`,
      percent: clampPercent(highestDiskUsage),
      icon: HardDrive,
    },
  ]
})

const healthInsights = computed(() => {
  const cpuUsage = clampPercent(server.value.cpu?.used)
  const memUsage = clampPercent(server.value.mem?.usage)
  const jvmUsage = clampPercent(server.value.jvm?.usage)
  const highestDiskUsage = diskRows.value.reduce((max, item) => Math.max(max, toNumber(item.usage)), 0)

  return [
    {
      label: 'CPU 负载',
      value: cpuUsage ? `${cpuUsage}%` : '--',
      badge: cpuUsage > 80 ? '关注' : '稳定',
      tone: cpuUsage > 80 ? 'destructive' : 'secondary',
      description: cpuUsage > 80 ? '处理器压力偏高，建议检查高负载请求。' : '处理器负载平稳。',
      icon: Cpu,
    },
    {
      label: '系统内存',
      value: memUsage ? `${memUsage}%` : '--',
      badge: memUsage > 80 ? '关注' : '稳定',
      tone: memUsage > 80 ? 'destructive' : 'secondary',
      description: memUsage > 80 ? '内存占用偏高，建议排查缓存和进程。' : '内存占用在可控范围内。',
      icon: Database,
    },
    {
      label: 'JVM 内存',
      value: jvmUsage ? `${jvmUsage}%` : '--',
      badge: jvmUsage > 80 ? '关注' : '稳定',
      tone: jvmUsage > 80 ? 'destructive' : 'secondary',
      description: jvmUsage > 80 ? '应用堆内存压力偏高。' : 'JVM 运行状态正常。',
      icon: Activity,
    },
    {
      label: '磁盘健康',
      value: highestDiskUsage ? `${highestDiskUsage}%` : '--',
      badge: highestDiskUsage > 85 ? '关注' : '稳定',
      tone: highestDiskUsage > 85 ? 'destructive' : 'secondary',
      description: highestDiskUsage > 85 ? '部分分区空间偏紧，建议清理。' : '磁盘容量余量充足。',
      icon: ShieldAlert,
    },
  ] as const
})

const resourcePanels = computed(() => [
  {
    title: '处理器',
    description: '看负载与空闲率。',
    value: server.value.cpu?.used !== undefined ? `${server.value.cpu.used}%` : '--',
    percent: clampPercent(server.value.cpu?.used),
    icon: Cpu,
    items: cpuItems.value,
  },
  {
    title: '系统内存',
    description: '先看总量，再看水位。',
    value: server.value.mem?.usage !== undefined ? `${server.value.mem.usage}%` : '--',
    percent: clampPercent(server.value.mem?.usage),
    icon: Database,
    items: memoryItems.value,
  },
  {
    title: 'JVM 内存',
    description: '应用本身的运行压力。',
    value: server.value.jvm?.usage !== undefined ? `${server.value.jvm.usage}%` : '--',
    percent: clampPercent(server.value.jvm?.usage),
    icon: Activity,
    items: jvmItems.value,
  },
])

const environmentFacts = computed(() => {
  const sys = server.value.sys ?? {}
  const jvm = server.value.jvm ?? {}

  return [
    { label: '主机名称', value: sys.computerName ?? '--' },
    { label: '操作系统', value: sys.osName ?? '--' },
    { label: '系统架构', value: sys.osArch ?? '--' },
    { label: '项目目录', value: sys.userDir ?? '--' },
    { label: 'Java 版本', value: jvm.version ?? '--' },
    { label: '运行时长', value: jvm.runTime ?? '--' },
  ]
})

async function loadServer() {
  loading.value = true
  try {
    const response = await getServer()
    server.value = response.data ?? {}
  }
  catch (error) {
    toast.error('服务监控加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    loading.value = false
  }
}

onMounted(loadServer)
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="admin-kicker">系统监控 / 服务监控</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight">服务监控</h1>
    </div>

    <AdminSectionCard title="运行概览" description="先看整体健康度，再进入资源与实例明细。">
      <template #headerExtra>
        <Button variant="outline" size="sm" class="gap-1.5" @click="loadServer">
          <RefreshCw class="size-3.5" />
          刷新监控
        </Button>
      </template>
      <div v-if="loading && !server.cpu" class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton v-for="index in 4" :key="index" class="h-40 rounded-[26px]" />
        </div>
        <div class="grid gap-4 xl:grid-cols-4">
          <Skeleton v-for="index in 4" :key="`health-${index}`" class="h-40 rounded-[26px]" />
        </div>
      </div>
      <div v-else class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div
            v-for="item in overviewCards"
            :key="item.label"
            class="rounded-[28px] border border-border/60 bg-background/85 px-5 py-5 shadow-sm"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-start gap-3">
                <div class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <component :is="item.icon" class="size-4.5" />
                </div>
                <div class="min-w-0">
                  <p class="text-xs uppercase tracking-[0.16em] text-muted-foreground">{{ item.label }}</p>
                  <p class="mt-2 text-[1.75rem] font-semibold tracking-tight">{{ item.value }}</p>
                </div>
              </div>
            </div>
            <p class="mt-3 text-sm text-muted-foreground">{{ item.hint }}</p>
            <div class="mt-4 h-2 rounded-full bg-muted/40">
              <div class="h-2 rounded-full transition-all" :class="progressClass(item.percent)" :style="{ width: `${item.percent}%` }" />
            </div>
          </div>
        </div>

        <div class="rounded-[28px] border border-border/60 bg-muted/12 p-5">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-base font-semibold tracking-tight">运行判断</p>
              <p class="mt-1 text-sm text-muted-foreground">把最需要关注的状态横向排开，便于快速比较。</p>
            </div>
            <Badge variant="outline">{{ loading ? '刷新中' : '已同步' }}</Badge>
          </div>

          <div class="mt-5 grid gap-3 xl:grid-cols-4">
            <div
              v-for="item in healthInsights"
              :key="item.label"
              class="rounded-[24px] border border-border/60 bg-background/85 px-4 py-4 shadow-sm"
            >
              <div class="flex items-start gap-3">
                <div class="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <component :is="item.icon" class="size-4" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-sm font-medium">{{ item.label }}</p>
                    <Badge :variant="item.tone === 'destructive' ? 'destructive' : 'secondary'">{{ item.badge }}</Badge>
                  </div>
                  <p class="mt-2 text-lg font-semibold">{{ item.value }}</p>
                  <p class="mt-1 text-xs leading-5 text-muted-foreground">{{ item.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminSectionCard>

    <div class="grid gap-6 2xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
      <AdminSectionCard title="资源剖面" description="把 CPU、系统内存和 JVM 放进同一视图。">
        <div class="grid gap-4 xl:grid-cols-3">
          <div
            v-for="panel in resourcePanels"
            :key="panel.title"
            class="rounded-[28px] border border-border/60 bg-background/85 px-5 py-5 shadow-sm"
          >
            <div class="flex items-start gap-3">
              <div class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <component :is="panel.icon" class="size-4.5" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold">{{ panel.title }}</p>
                <p class="mt-1 text-xs text-muted-foreground">{{ panel.description }}</p>
                <p class="mt-4 text-[1.9rem] font-semibold tracking-tight">{{ panel.value }}</p>
                <div class="mt-4 h-2 rounded-full bg-muted/40">
                  <div class="h-2 rounded-full transition-all" :class="progressClass(panel.percent)" :style="{ width: `${panel.percent}%` }" />
                </div>
              </div>
            </div>

            <div class="mt-5 grid gap-3">
              <div
                v-for="item in panel.items"
                :key="item.label"
                class="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/12 px-4 py-3"
              >
                <span class="text-sm text-muted-foreground">{{ item.label }}</span>
                <span class="text-sm font-medium">{{ item.value }}</span>
              </div>
            </div>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="实例环境" description="把主机、系统和项目信息压成更紧凑的概览。">
        <div class="grid gap-3 sm:grid-cols-2 2xl:grid-cols-2">
          <div
            v-for="item in environmentFacts"
            :key="item.label"
            class="rounded-[24px] border border-border/60 bg-background/85 px-4 py-4 shadow-sm"
          >
            <p class="text-xs uppercase tracking-[0.16em] text-muted-foreground">{{ item.label }}</p>
            <p class="mt-2 break-all text-sm font-medium leading-6">{{ item.value }}</p>
          </div>
        </div>
      </AdminSectionCard>
    </div>

    <AdminSectionCard title="服务器信息" description="主机、IP 和系统版本。">
      <div v-if="loading" class="text-sm text-muted-foreground">正在加载服务器信息...</div>
      <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="item in systemItems"
          :key="item.label"
          class="rounded-[24px] border border-border/60 bg-muted/12 px-4 py-4"
        >
          <p class="text-xs uppercase tracking-[0.16em] text-muted-foreground">{{ item.label }}</p>
          <p class="mt-2 break-all text-base font-medium">{{ item.value }}</p>
        </div>
      </div>
    </AdminSectionCard>

    <AdminSectionCard title="Java 虚拟机" description="版本、路径、启动时间和运行参数。">
      <div v-if="loading" class="text-sm text-muted-foreground">正在加载 JVM 信息...</div>
      <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="item in jvmDetailItems"
          :key="item.label"
          class="rounded-[24px] border border-border/60 bg-muted/12 px-4 py-4"
          :class="item.label === '运行参数' ? 'md:col-span-2 xl:col-span-4' : ''"
        >
          <p class="text-xs uppercase tracking-[0.16em] text-muted-foreground">{{ item.label }}</p>
          <p class="mt-2 break-all text-sm font-medium leading-6">{{ item.value }}</p>
        </div>
      </div>
    </AdminSectionCard>

    <AdminSectionCard title="磁盘状态" description="最后再看分区容量与使用率。">
      <AdminDataTable
        :columns="diskColumns"
        :rows="diskRows"
        row-key="dirName"
        :loading="loading"
        loading-text="正在加载磁盘信息..."
        empty-text="暂无磁盘信息"
      >
        <template #cell-usage="{ value }">
          <Badge :variant="usageVariant(value)">{{ value ? `${value}%` : '--' }}</Badge>
        </template>
      </AdminDataTable>
    </AdminSectionCard>
  </div>
</template>
