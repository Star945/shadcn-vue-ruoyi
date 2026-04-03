<script setup lang="ts">
import { Bell, CheckCheck, LoaderCircle, RefreshCw } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { getNotice, listNoticeTop, markNoticeRead, markNoticeReadAll } from '@/api/system/notice'
import AdminDialogContent from '@/components/admin/AdminDialogContent.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NoticeItem {
  noticeId: string | number
  noticeTitle: string
  noticeType: string
  noticeContent?: string
  createBy?: string
  createTime?: string
  isRead?: boolean
}

const copy = {
  untitled: '\u672a\u547d\u540d\u516c\u544a',
  notice: '\u901a\u77e5',
  bulletin: '\u516c\u544a',
  loadFailed: '\u901a\u77e5\u4e2d\u5fc3\u52a0\u8f7d\u5931\u8d25',
  detailFailed: '\u516c\u544a\u8be6\u60c5\u52a0\u8f7d\u5931\u8d25',
  retry: '\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002',
  markAllSuccess: '\u901a\u77e5\u5df2\u5168\u90e8\u6807\u8bb0\u4e3a\u5df2\u8bfb',
  markAllFailed: '\u5168\u90e8\u5df2\u8bfb\u64cd\u4f5c\u5931\u8d25',
  centerTitle: '\u901a\u77e5\u516c\u544a',
  centerDescription: '\u6700\u65b0\u516c\u544a\u3002',
  loading: '\u6b63\u5728\u52a0\u8f7d\u901a\u77e5...',
  empty: '\u6682\u65e0\u516c\u544a',
  unreadPrefix: '\u672a\u8bfb',
  itemSuffix: '\u6761',
  viewManage: '\u67e5\u770b\u516c\u544a\u7ba1\u7406',
  previewTitle: '\u516c\u544a\u8be6\u60c5',
  previewDescription: '\u516c\u544a\u5185\u5bb9\u3002',
  publisher: '\u53d1\u5e03\u4eba',
  publishTime: '\u53d1\u5e03\u65f6\u95f4',
  loadingDetail: '\u6b63\u5728\u52a0\u8f7d\u8be6\u60c5...',
  noContent: '\u6682\u65e0\u5185\u5bb9',
} as const

const router = useRouter()

const open = ref(false)
const loading = ref(false)
const markingAll = ref(false)
const notices = ref<NoticeItem[]>([])
const unreadCount = ref(0)
const previewOpen = ref(false)
const previewLoading = ref(false)
const previewNotice = ref<NoticeItem | null>(null)

const hasUnread = computed(() => unreadCount.value > 0)
const noticeCountLabel = computed(() => unreadCount.value > 99 ? '99+' : String(unreadCount.value))
const previewHtml = computed(() => resolveNoticeHtml(previewNotice.value?.noticeContent || `<p>${copy.noContent}</p>`))

function normalizeNotice(item: Record<string, any>): NoticeItem {
  return {
    noticeId: item.noticeId,
    noticeTitle: String(item.noticeTitle ?? copy.untitled),
    noticeType: String(item.noticeType ?? '1'),
    noticeContent: String(item.noticeContent ?? ''),
    createBy: String(item.createBy ?? ''),
    createTime: String(item.createTime ?? ''),
    isRead: Boolean(item.isRead),
  }
}

function noticeTypeText(value: string) {
  return value === '1' ? copy.notice : copy.bulletin
}

function noticeTypeVariant(value: string) {
  return value === '1' ? 'secondary' : 'outline'
}

function resolveNoticeAssetUrl(value: string) {
  const raw = value.trim()
  if (!raw || /^(https?:|data:|blob:|mailto:|tel:|#)/i.test(raw)) {
    return raw
  }
  const base = String(import.meta.env.VITE_APP_BASE_API ?? '').trim()
  if (!base) {
    return raw
  }
  return raw.startsWith('/') ? `${base}${raw}` : `${base}/${raw}`
}

function resolveNoticeHtml(html: string) {
  return html.replace(/(src|href)=(["'])([^"']+)\2/gi, (_match, attr, quote, value) => {
    const nextValue = resolveNoticeAssetUrl(String(value))
    return `${attr}=${quote}${nextValue}${quote}`
  })
}

function syncUnreadCount(explicitCount?: unknown) {
  if (typeof explicitCount === 'number') {
    unreadCount.value = explicitCount
    return
  }
  unreadCount.value = notices.value.filter(item => !item.isRead).length
}

async function loadNotices(silent = false) {
  loading.value = true
  try {
    const response = await listNoticeTop()
    notices.value = Array.isArray(response.data) ? response.data.map(item => normalizeNotice(item)) : []
    syncUnreadCount(response.unreadCount)
  }
  catch (error) {
    if (!silent) {
      toast.error(copy.loadFailed, { description: error instanceof Error ? error.message : copy.retry })
    }
  }
  finally {
    loading.value = false
  }
}

function updateReadState(noticeId: string | number) {
  notices.value = notices.value.map(item => item.noticeId === noticeId ? { ...item, isRead: true } : item)
  syncUnreadCount()
}

async function openPreview(item: NoticeItem) {
  open.value = false
  previewLoading.value = true
  previewOpen.value = true

  if (!item.isRead) {
    updateReadState(item.noticeId)
    markNoticeRead(item.noticeId).catch(() => {})
  }

  try {
    const response = await getNotice(item.noticeId)
    previewNotice.value = normalizeNotice(response.data ?? item)
  }
  catch (error) {
    previewNotice.value = item
    toast.error(copy.detailFailed, { description: error instanceof Error ? error.message : copy.retry })
  }
  finally {
    previewLoading.value = false
  }
}

async function handleMarkAllRead() {
  const unreadIds = notices.value.filter(item => !item.isRead).map(item => item.noticeId)
  if (!unreadIds.length) {
    return
  }

  markingAll.value = true
  try {
    await markNoticeReadAll(unreadIds.join(','))
    notices.value = notices.value.map(item => ({ ...item, isRead: true }))
    unreadCount.value = 0
    toast.success(copy.markAllSuccess)
  }
  catch (error) {
    toast.error(copy.markAllFailed, { description: error instanceof Error ? error.message : copy.retry })
  }
  finally {
    markingAll.value = false
  }
}

function goNoticePage() {
  open.value = false
  router.push('/system/notice')
}

watch(open, async (value) => {
  if (value) {
    await loadNotices(true)
  }
})

onMounted(() => {
  loadNotices(true)
})
</script>

<template>
  <DropdownMenu v-model:open="open">
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" class="relative">
        <Bell class="size-4" />
        <span v-if="hasUnread" class="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
          {{ noticeCountLabel }}
        </span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-[min(22rem,calc(100vw-1rem))] rounded-3xl p-0 sm:w-[380px]">
      <div class="flex items-start justify-between gap-3 px-4 py-3">
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold">{{ copy.centerTitle }}</p>
          <p class="mt-1 text-xs leading-5 text-muted-foreground">{{ copy.centerDescription }}</p>
        </div>
        <div class="shrink-0 flex items-center gap-1">
          <Button variant="ghost" size="icon" class="size-8" :disabled="loading" @click="loadNotices()">
            <RefreshCw class="size-4" :class="loading ? 'animate-spin' : ''" />
          </Button>
          <Button variant="ghost" size="icon" class="size-8" :disabled="markingAll || !hasUnread" @click="handleMarkAllRead">
            <CheckCheck class="size-4" />
          </Button>
        </div>
      </div>
      <DropdownMenuSeparator />
      <div class="max-h-[26rem] overflow-y-auto surface-scrollbar p-2">
        <div v-if="loading" class="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
          <LoaderCircle class="size-4 animate-spin" />
          {{ copy.loading }}
        </div>
        <div v-else-if="!notices.length" class="px-4 py-10 text-center text-sm text-muted-foreground">
          {{ copy.empty }}
        </div>
        <DropdownMenuItem
          v-for="item in notices"
          :key="item.noticeId"
          class="mb-1 flex cursor-pointer items-start gap-3 rounded-2xl px-3 py-3 data-[highlighted]:bg-muted/70"
          @select="openPreview(item)"
        >
          <Badge :variant="noticeTypeVariant(item.noticeType)">{{ noticeTypeText(item.noticeType) }}</Badge>
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-3">
              <p class="truncate text-sm font-medium" :class="item.isRead ? 'text-muted-foreground' : 'text-foreground'">{{ item.noticeTitle }}</p>
              <span v-if="!item.isRead" class="mt-1 size-2 rounded-full bg-primary" />
            </div>
            <p class="mt-1 text-xs text-muted-foreground">{{ item.createTime || '--' }}</p>
          </div>
        </DropdownMenuItem>
      </div>
      <DropdownMenuSeparator />
      <div class="flex flex-col gap-2 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>{{ copy.unreadPrefix }} {{ unreadCount }} {{ copy.itemSuffix }}</span>
        <button type="button" class="text-left font-medium text-primary transition hover:text-primary/80 sm:text-right" @click="goNoticePage">
          {{ copy.viewManage }}
        </button>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>

  <Dialog v-model:open="previewOpen">
    <AdminDialogContent size="lg">
      <DialogHeader>
        <DialogTitle>{{ previewNotice?.noticeTitle || copy.previewTitle }}</DialogTitle>
        <DialogDescription>{{ copy.previewDescription }}</DialogDescription>
      </DialogHeader>

      <div v-if="previewLoading" class="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <LoaderCircle class="size-4 animate-spin" />
        {{ copy.loadingDetail }}
      </div>
      <div v-else class="space-y-4">
        <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge :variant="noticeTypeVariant(String(previewNotice?.noticeType ?? '1'))">{{ noticeTypeText(String(previewNotice?.noticeType ?? '1')) }}</Badge>
          <span>{{ copy.publisher }} {{ previewNotice?.createBy || '--' }}</span>
          <span>{{ copy.publishTime }} {{ previewNotice?.createTime || '--' }}</span>
        </div>
        <div class="rounded-3xl border border-border/60 bg-muted/20 px-5 py-5">
          <div class="notice-rich text-sm leading-7 text-foreground" v-html="previewHtml" />
        </div>
      </div>
    </AdminDialogContent>
  </Dialog>
</template>

<style scoped>
.notice-rich :deep(img) {
  max-width: 100%;
  border-radius: var(--radius);
}

.notice-rich :deep(p) {
  margin: 0 0 1em;
}

.notice-rich :deep(a) {
  color: hsl(var(--primary));
  text-decoration: underline;
}

.notice-rich :deep(h1),
.notice-rich :deep(h2),
.notice-rich :deep(h3) {
  margin: 0 0 0.75rem;
  line-height: 1.4;
}

.notice-rich :deep(h1) {
  font-size: 1.5rem;
  font-weight: 700;
}

.notice-rich :deep(h2) {
  font-size: 1.25rem;
  font-weight: 700;
}

.notice-rich :deep(h3) {
  font-size: 1.125rem;
  font-weight: 600;
}

.notice-rich :deep(blockquote) {
  margin: 0.75rem 0;
  border-left: 3px solid hsl(var(--primary) / 0.35);
  padding-left: 1rem;
  color: hsl(var(--muted-foreground));
}

.notice-rich :deep(pre) {
  margin: 0.75rem 0;
  overflow-x: auto;
  border-radius: var(--radius-lg);
  border: 1px solid hsl(var(--border));
  background: hsl(var(--muted) / 0.45);
  padding: 0.875rem 1rem;
}

.notice-rich :deep(code) {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
}
</style>






