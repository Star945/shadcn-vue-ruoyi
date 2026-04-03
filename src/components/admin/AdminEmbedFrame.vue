<script setup lang="ts">
import { ShieldAlert } from 'lucide-vue-next'
import { ref } from 'vue'
import { toast } from 'vue-sonner'

import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import { Button } from '@/components/ui/button'

const props = withDefaults(defineProps<{
  title: string
  description: string
  src: string
  sectionLabel?: string
  panelTitle?: string
  panelDescription?: string
  canView?: boolean
  canRefresh?: boolean
  canCopy?: boolean
  canOpen?: boolean
  blockedTitle?: string
  blockedDescription?: string
}>(), {
  sectionLabel: '系统面板',
  panelTitle: '嵌入面板',
  panelDescription: '可刷新或新开。',
  canView: true,
  canRefresh: true,
  canCopy: true,
  canOpen: true,
  blockedTitle: '暂无权限',
  blockedDescription: '当前账号暂不可查看。',
})

const refreshKey = ref(0)

function refreshFrame() {
  refreshKey.value += 1
}

function openInNewTab() {
  window.open(props.src, '_blank', 'noopener,noreferrer')
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(props.src)
    toast.success('链接已复制')
  }
  catch (error) {
    toast.error('复制链接失败', { description: error instanceof Error ? error.message : '请手动复制当前地址。' })
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">{{ sectionLabel }}</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight">{{ title }}</h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{{ description }}</p>
      </div>
      <div v-if="props.canView && (canRefresh || canCopy || canOpen)" class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
        <Button v-if="canRefresh" variant="outline" class="w-full sm:w-auto" @click="refreshFrame">刷新</Button>
        <Button v-if="canCopy" variant="outline" class="w-full sm:w-auto" @click="copyLink">复制链接</Button>
        <Button v-if="canOpen" class="col-span-2 w-full sm:col-span-1 sm:w-auto" @click="openInNewTab">新开窗口</Button>
      </div>
    </div>

    <AdminSectionCard :title="panelTitle" :description="panelDescription">
      <div v-if="!props.canView" class="flex min-h-[72vh] flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-muted/10 px-6 py-10 text-center">
        <div class="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
          <ShieldAlert class="size-7" />
        </div>
        <p class="mt-5 text-lg font-semibold tracking-tight">{{ blockedTitle }}</p>
        <p class="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{{ blockedDescription }}</p>
      </div>
      <iframe
        v-else
        :key="refreshKey"
        :src="src"
        class="min-h-[72vh] w-full rounded-3xl border border-border/60 bg-white"
        loading="lazy"
        referrerpolicy="no-referrer"
      />
    </AdminSectionCard>
  </div>
</template>

