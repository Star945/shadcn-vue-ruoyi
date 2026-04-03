<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { Copy, Eye, RefreshCw, Trash2 } from 'lucide-vue-next'

import type { AdminTableActionItem, AdminTableColumn } from '@/components/admin/data-table'

import { clearCacheAll, clearCacheKey, clearCacheName, getCache, getCacheValue, listCacheKey, listCacheName } from '@/api/monitor/cache'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAccess } from '@/lib/access'
import { prettyJson } from '@/lib/monitor'
import { permissionKeys } from '@/lib/permission-keys'

interface CacheNameRow {
  rawName: string
  name: string
  remark: string
}

interface CacheKeyRow {
  rawKey: string
  key: string
}

const cacheNameColumns: AdminTableColumn[] = [
  { key: 'name', title: '缓存名称' },
  { key: 'remark', title: '备注' },
]

const cacheKeyColumns: AdminTableColumn[] = [
  { key: 'key', title: '缓存键' },
]

const route = useRoute()
const access = useAccess()
const cachePerms = permissionKeys.monitor.cache

const loading = ref(false)
const cache = ref<Record<string, any>>({})
const cacheNameRows = ref<CacheNameRow[]>([])
const cacheKeyRows = ref<CacheKeyRow[]>([])
const selectedCacheName = ref('')
const selectedCacheKey = ref('')
const selectedCacheValue = ref<any>(null)
const keyLoading = ref(false)
const valueLoading = ref(false)

const selectedCacheNameLabel = computed(() => stripCacheName(selectedCacheName.value))
const selectedCacheKeyLabel = computed(() => stripCacheKey(selectedCacheKey.value, selectedCacheName.value))
const commandStats = computed(() => Array.isArray(cache.value.commandStats) ? cache.value.commandStats : [])
const selectedValueText = computed(() => prettyJson(selectedCacheValue.value))
const hasCacheScopedPermissions = computed(() => access.hasAnyPrefix('monitor:cache:'))
const canManageCache = computed(() => !hasCacheScopedPermissions.value || access.can(cachePerms.manage))
const cacheReadonlyNotice = computed(() => hasCacheScopedPermissions.value && !canManageCache.value
  ? '仅可查看。'
  : '')
const isCacheListPage = computed(() => route.path === '/monitor/cacheList')
const pageEyebrow = computed(() => isCacheListPage.value ? '系统监控 / 缓存列表' : '系统监控 / 缓存监控')
const pageTitle = computed(() => isCacheListPage.value ? '缓存列表' : '缓存监控')
const refreshButtonText = computed(() => isCacheListPage.value ? '刷新列表' : '刷新监控')
const cacheNameCount = computed(() => cacheNameRows.value.length)
const cacheKeyCount = computed(() => cacheKeyRows.value.length)
const canCopyValue = computed(() => {
  const text = selectedValueText.value.trim()
  return Boolean(text && text !== '--')
})
const valueCardDescription = computed(() => selectedCacheName.value && selectedCacheKey.value
  ? `${selectedCacheNameLabel.value} / ${selectedCacheKeyLabel.value}`
  : '从左侧选择缓存键查看内容。')

const cacheNameRowActions: AdminTableActionItem[] = [
  { label: '查看', icon: Eye, onClick: (row) => loadCacheKeys(row.rawName) },
  { label: '清理', icon: Trash2, tone: 'danger', visible: () => canManageCache.value, onClick: (row) => handleClearName(row.rawName) },
]

const cacheKeyRowActions: AdminTableActionItem[] = [
  { label: '查看', icon: Eye, onClick: (row) => loadCacheValue(selectedCacheName.value, row.rawKey) },
  { label: '清理', icon: Trash2, tone: 'danger', visible: () => canManageCache.value, onClick: (row) => handleClearKey(row.rawKey) },
]
const basicItems = computed(() => {
  const info = cache.value.info ?? {}
  return [
    { label: 'Redis 版本', value: info.redis_version ?? '--' },
    { label: '运行模式', value: info.redis_mode === 'standalone' ? '单机' : info.redis_mode ?? '--' },
    { label: '端口', value: info.tcp_port ?? '--' },
    { label: '客户端数', value: info.connected_clients ?? '--' },
    { label: '运行天数', value: info.uptime_in_days ?? '--' },
    { label: '使用内存', value: info.used_memory_human ?? '--' },
    { label: '内存配置', value: info.maxmemory_human ?? '--' },
    { label: 'Key 数量', value: cache.value.dbSize ?? cache.value.dbsize ?? '--' },
    { label: 'AOF 状态', value: info.aof_enabled === undefined ? '--' : String(info.aof_enabled) === '0' ? '关闭' : '开启' },
    { label: 'RDB 状态', value: info.rdb_last_bgsave_status ?? '--' },
    { label: '网络入口', value: info.instantaneous_input_kbps ? `${info.instantaneous_input_kbps} kps` : '--' },
    { label: '网络出口', value: info.instantaneous_output_kbps ? `${info.instantaneous_output_kbps} kps` : '--' },
  ]
})

function stripCacheName(cacheName: string) {
  return cacheName.replace(/:$/, '')
}

function stripCacheKey(cacheKey: string, cacheName: string) {
  if (!cacheName) {
    return cacheKey
  }
  return cacheKey.startsWith(cacheName) ? cacheKey.slice(cacheName.length) || cacheKey : cacheKey
}

function normalizeCacheNameRow(item: unknown) {
  if (typeof item === 'string') {
    const rawName = item.trim()
    return rawName
      ? {
          rawName,
          name: stripCacheName(rawName),
          remark: '--',
        }
      : null
  }

  if (!item || typeof item !== 'object') {
    return null
  }

  const raw = item as Record<string, unknown>
  const rawName = String(raw.cacheName ?? raw.name ?? '').trim()
  if (!rawName) {
    return null
  }

  return {
    rawName,
    name: stripCacheName(rawName),
    remark: String(raw.remark ?? '--') || '--',
  } satisfies CacheNameRow
}

function normalizeCacheKeyRow(item: unknown, cacheName: string) {
  const rawKey = typeof item === 'string'
    ? item.trim()
    : item && typeof item === 'object'
      ? String((item as Record<string, unknown>).cacheKey ?? (item as Record<string, unknown>).key ?? '').trim()
      : ''

  if (!rawKey) {
    return null
  }

  return {
    rawKey,
    key: stripCacheKey(rawKey, cacheName),
  } satisfies CacheKeyRow
}

function fallbackCopyText(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

async function handleCopyValue() {
  const text = selectedValueText.value.trim()
  if (!text || text === '--') {
    toast.warning('暂无可复制内容')
    return
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    }
    else {
      fallbackCopyText(text)
    }
    toast.success('已复制')
  }
  catch (error) {
    toast.error('复制缓存值失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function loadCacheKeys(cacheName: string, preserveKey = false) {
  keyLoading.value = true
  valueLoading.value = false
  selectedCacheName.value = cacheName
  try {
    const response = await listCacheKey(cacheName)
    cacheKeyRows.value = (Array.isArray(response.data) ? response.data : [])
      .map(item => normalizeCacheKeyRow(item, cacheName))
      .filter((item): item is CacheKeyRow => Boolean(item))

    const nextKey = preserveKey && selectedCacheKey.value && cacheKeyRows.value.some(item => item.rawKey === selectedCacheKey.value)
      ? selectedCacheKey.value
      : cacheKeyRows.value[0]?.rawKey ?? ''

    if (nextKey) {
      await loadCacheValue(cacheName, nextKey)
    }
    else {
      selectedCacheKey.value = ''
      selectedCacheValue.value = null
    }
  }
  catch (error) {
    cacheKeyRows.value = []
    selectedCacheKey.value = ''
    selectedCacheValue.value = null
    toast.error('加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    keyLoading.value = false
  }
}

async function loadCacheValue(cacheName: string, cacheKey: string) {
  valueLoading.value = true
  selectedCacheName.value = cacheName
  selectedCacheKey.value = cacheKey
  try {
    const response = await getCacheValue(cacheName, cacheKey)
    selectedCacheValue.value = response.data?.cacheValue ?? response.data
  }
  catch (error) {
    selectedCacheValue.value = null
    toast.error('缓存值加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    valueLoading.value = false
  }
}

async function refreshCacheState(preserveSelection = true) {
  loading.value = true
  try {
    const [cacheResponse, nameResponse] = await Promise.all([
      getCache(),
      listCacheName(),
    ])

    cache.value = cacheResponse.data ?? {}
    cacheNameRows.value = (Array.isArray(nameResponse.data) ? nameResponse.data : [])
      .map(item => normalizeCacheNameRow(item))
      .filter((item): item is CacheNameRow => Boolean(item))

    const nextName = preserveSelection && selectedCacheName.value && cacheNameRows.value.some(item => item.rawName === selectedCacheName.value)
      ? selectedCacheName.value
      : cacheNameRows.value[0]?.rawName ?? ''

    if (nextName) {
      await loadCacheKeys(nextName, preserveSelection)
    }
    else {
      selectedCacheName.value = ''
      selectedCacheKey.value = ''
      selectedCacheValue.value = null
      cacheKeyRows.value = []
    }
  }
  catch (error) {
    toast.error('加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    loading.value = false
  }
}

function requireCacheManage(actionLabel: string) {
  if (!hasCacheScopedPermissions.value) {
    return true
  }
  return access.require(cachePerms.manage, actionLabel)
}

async function handleClearAll() {
  if (!requireCacheManage('清理缓存')) {
    return
  }
  try {
    await clearCacheAll()
    toast.success('已清理全部缓存')
    await refreshCacheState(false)
  }
  catch (error) {
    toast.error('清理失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function handleClearName(cacheName: string) {
  if (!requireCacheManage('按名称清理缓存')) {
    return
  }
  try {
    await clearCacheName(cacheName)
    toast.success(`已清理 ${stripCacheName(cacheName)}`)
    await refreshCacheState(false)
  }
  catch (error) {
    toast.error('清理失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function handleClearKey(cacheKey: string) {
  if (!requireCacheManage('按键清理缓存')) {
    return
  }
  try {
    await clearCacheKey(cacheKey)
    toast.success(`已清理 ${stripCacheKey(cacheKey, selectedCacheName.value)}`)
    await refreshCacheState(true)
  }
  catch (error) {
    toast.error('清理失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

onMounted(() => refreshCacheState(false))
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">{{ pageEyebrow }}</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight">{{ pageTitle }}</h1>
      </div>
    </div>

    <div v-if="cacheReadonlyNotice" class="rounded-3xl border border-amber-300/60 bg-amber-50/80 px-5 py-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
      {{ cacheReadonlyNotice }}
    </div>

    <AdminSectionCard title="Redis 概览" description="当前状态。">
      <template #headerExtra>
        <Button variant="outline" size="sm" class="gap-1" @click="refreshCacheState(true)"><RefreshCw class="size-3.5" />{{ refreshButtonText }}</Button>
        <Button v-if="canManageCache" variant="outline" size="sm" @click="handleClearAll">清理全部</Button>
      </template>
      <div v-if="loading" class="text-sm text-muted-foreground">正在加载...</div>
      <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="item in basicItems" :key="item.label" class="rounded-2xl border border-border/60 bg-muted/20 px-4 py-4">
          <p class="text-sm text-muted-foreground">{{ item.label }}</p>
          <p class="mt-2 break-all text-sm font-medium">{{ item.value }}</p>
        </div>
      </div>
    </AdminSectionCard>

    <AdminSectionCard v-if="commandStats.length" title="命令统计" description="命中统计。">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="item in commandStats" :key="item.name" class="rounded-2xl border border-border/60 bg-muted/20 px-4 py-4">
          <p class="text-sm text-muted-foreground">{{ item.name }}</p>
          <p class="mt-2 break-all text-base font-semibold">{{ item.value }}</p>
        </div>
      </div>
    </AdminSectionCard>

    <div class="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_minmax(0,1.1fr)]">
      <AdminSectionCard
        title="缓存名称"
        :description="selectedCacheName ? `已选：${selectedCacheNameLabel}` : '选择缓存名称。'"
      >
        <template #headerExtra>
          <Badge variant="outline">共 {{ cacheNameCount }} 项</Badge>
        </template>
        <div v-if="loading && !cacheNameRows.length" class="rounded-3xl border border-border/60 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground md:hidden">
          正在加载...
        </div>
        <div v-else-if="cacheNameRows.length" class="space-y-3 md:hidden">
          <div v-for="row in cacheNameRows" :key="row.rawName" class="rounded-3xl border border-border/60 bg-muted/10 p-4">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="truncate text-sm font-semibold">{{ row.name }}</p>
                <Badge v-if="row.rawName === selectedCacheName" variant="outline">当前</Badge>
              </div>
              <p class="mt-1 break-all text-xs text-muted-foreground">{{ row.remark }}</p>
            </div>
            <div class="mt-3 border-t border-border/60 pt-3">
              <div class="flex flex-wrap justify-start gap-x-3 gap-y-1">
                <Button variant="link" size="sm" class="h-auto px-0 text-xs" @click="loadCacheKeys(row.rawName)">
                  <Eye class="size-3.5" />
                  查看
                </Button>
                <Button v-if="canManageCache" variant="link" size="sm" class="h-auto px-0 text-xs text-destructive hover:text-destructive/80" @click="handleClearName(row.rawName)">
                  <Trash2 class="size-3.5" />
                  清理
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="rounded-3xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground md:hidden">
          暂无缓存
        </div>
        <div class="hidden md:block">
          <AdminDataTable
            :columns="cacheNameColumns"
            :rows="cacheNameRows"
            row-key="rawName"
            :loading="loading"
            loading-text="正在加载..."
            empty-text="暂无缓存"
            :actions="cacheNameRowActions"
            action-header-class="w-[104px] text-right"
          >
            <template #cell-name="{ row }">
              <div class="flex items-center gap-2">
                <span class="font-medium">{{ row.name }}</span>
                <Badge v-if="row.rawName === selectedCacheName" variant="outline">当前</Badge>
              </div>
            </template>
          </AdminDataTable>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="缓存键"
        :description="selectedCacheKey ? `已选：${selectedCacheKeyLabel}` : '选择缓存键。'"
      >
        <template #headerExtra>
          <Badge variant="outline">共 {{ cacheKeyCount }} 项</Badge>
        </template>
        <div v-if="keyLoading && !cacheKeyRows.length" class="rounded-3xl border border-border/60 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground md:hidden">
          正在加载...
        </div>
        <div v-else-if="cacheKeyRows.length" class="space-y-3 md:hidden">
          <div v-for="row in cacheKeyRows" :key="row.rawKey" class="rounded-3xl border border-border/60 bg-muted/10 p-4">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="break-all text-sm font-semibold">{{ row.key }}</p>
                <Badge v-if="row.rawKey === selectedCacheKey" variant="outline">当前</Badge>
              </div>
            </div>
            <div class="mt-3 border-t border-border/60 pt-3">
              <div class="flex flex-wrap justify-start gap-x-3 gap-y-1">
                <Button variant="link" size="sm" class="h-auto px-0 text-xs" @click="loadCacheValue(selectedCacheName, row.rawKey)">
                  <Eye class="size-3.5" />
                  查看
                </Button>
                <Button v-if="canManageCache" variant="link" size="sm" class="h-auto px-0 text-xs text-destructive hover:text-destructive/80" @click="handleClearKey(row.rawKey)">
                  <Trash2 class="size-3.5" />
                  清理
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="rounded-3xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground md:hidden">
          暂无键
        </div>
        <div class="hidden md:block">
          <AdminDataTable
            :columns="cacheKeyColumns"
            :rows="cacheKeyRows"
            row-key="rawKey"
            :loading="keyLoading"
            loading-text="正在加载..."
            empty-text="暂无键"
            :actions="cacheKeyRowActions"
            action-header-class="w-[104px] text-right"
          >
            <template #cell-key="{ row }">
              <div class="flex items-center gap-2">
                <span class="break-all font-medium">{{ row.key }}</span>
                <Badge v-if="row.rawKey === selectedCacheKey" variant="outline">当前</Badge>
              </div>
            </template>
          </AdminDataTable>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        card-class="xl:col-span-2 2xl:col-span-1"
        title="缓存值详情"
        :description="valueCardDescription"
      >
        <template #headerExtra>
          <Button variant="outline" size="sm" class="gap-1" :disabled="!canCopyValue" @click="handleCopyValue">
            <Copy class="size-3.5" />
            复制内容
          </Button>
        </template>
        <div class="rounded-3xl border border-border/60 bg-muted/20 p-4">
          <pre class="min-h-[160px] overflow-x-auto surface-scrollbar whitespace-pre-wrap font-mono text-xs leading-6 text-foreground sm:min-h-[240px] xl:min-h-[480px]">{{ valueLoading ? '正在加载缓存值...' : selectedValueText }}</pre>
        </div>
      </AdminSectionCard>
    </div>
  </div>
</template>














