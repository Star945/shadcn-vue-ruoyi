<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { RefreshCw } from 'lucide-vue-next'

import type { AdminTableColumn } from '@/components/admin/data-table'

import { getServer } from '@/api/monitor/server'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

function usageVariant(value: unknown) {
  return Number(value ?? 0) > 80 ? 'destructive' : 'outline'
}

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
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">系统监控 / 服务监控</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight">服务监控</h1>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      <Card class="border-white/60 bg-white/75 dark:border-white/10 dark:bg-white/5">
        <CardHeader><CardTitle>处理器</CardTitle></CardHeader>
        <CardContent class="grid gap-3">
          <div v-for="item in cpuItems" :key="item.label" class="flex flex-col items-start gap-1 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span class="text-sm text-muted-foreground">{{ item.label }}</span>
            <span class="text-sm font-medium">{{ item.value }}</span>
          </div>
        </CardContent>
      </Card>

      <Card class="border-white/60 bg-white/75 dark:border-white/10 dark:bg-white/5">
        <CardHeader><CardTitle>系统内存</CardTitle></CardHeader>
        <CardContent class="grid gap-3">
          <div v-for="item in memoryItems" :key="item.label" class="flex flex-col items-start gap-1 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span class="text-sm text-muted-foreground">{{ item.label }}</span>
            <span class="text-sm font-medium">{{ item.value }}</span>
          </div>
        </CardContent>
      </Card>

      <Card class="border-white/60 bg-white/75 dark:border-white/10 dark:bg-white/5">
        <CardHeader><CardTitle>JVM 内存</CardTitle></CardHeader>
        <CardContent class="grid gap-3">
          <div v-for="item in jvmItems" :key="item.label" class="flex flex-col items-start gap-1 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span class="text-sm text-muted-foreground">{{ item.label }}</span>
            <span class="text-sm font-medium">{{ item.value }}</span>
          </div>
        </CardContent>
      </Card>
    </div>

    <AdminSectionCard title="服务器信息" description="当前主机信息。">
      <template #headerExtra>
        <Button variant="outline" size="sm" class="gap-1" @click="loadServer">
          <RefreshCw class="size-3.5" />
          刷新监控
        </Button>
      </template>
      <div v-if="loading" class="text-sm text-muted-foreground">正在加载服务器信息...</div>
      <div v-else class="grid gap-4 sm:grid-cols-2">
        <div v-for="item in systemItems" :key="item.label" class="rounded-2xl border border-border/60 bg-muted/20 px-4 py-4">
          <p class="text-sm text-muted-foreground">{{ item.label }}</p>
          <p class="mt-2 break-all text-base font-medium">{{ item.value }}</p>
        </div>
      </div>
    </AdminSectionCard>

    <AdminSectionCard title="Java 虚拟机" description="JVM 信息。">
      <div v-if="loading" class="text-sm text-muted-foreground">正在加载 JVM 信息...</div>
      <div v-else class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        <div v-for="item in jvmDetailItems" :key="item.label" class="rounded-2xl border border-border/60 bg-muted/20 px-4 py-4">
          <p class="text-sm text-muted-foreground">{{ item.label }}</p>
          <p class="mt-2 break-all text-sm font-medium">{{ item.value }}</p>
        </div>
      </div>
    </AdminSectionCard>

    <AdminSectionCard title="磁盘状态" description="磁盘使用情况。">
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






