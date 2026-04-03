<script setup lang="ts">
import { Ellipsis, RefreshCw, X } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OverlayScrollbar } from '@/components/ui/overlay-scrollbar'
import { resolveIcon } from '@/lib/icons'
import { useNavigationStore } from '@/stores/navigation'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const router = useRouter()
const navigation = useNavigationStore()
const ui = useUiStore()

const tags = computed(() => ui.visitedTags)
const activePath = computed(() => route.path)
const activeIndex = computed(() => tags.value.findIndex(tag => tag.path === activePath.value))
const canCloseCurrent = computed(() => activePath.value !== '/index')
const canCloseLeft = computed(() => activeIndex.value > 1)
const canCloseRight = computed(() => activeIndex.value >= 0 && activeIndex.value < tags.value.length - 1)
const canCloseOthers = computed(() => tags.value.some(tag => tag.path !== '/index' && tag.path !== activePath.value))
const canCloseAll = computed(() => tags.value.length > 1)
const showTagIcons = computed(() => ui.layout.tagsIcon)
const contextMenuRef = ref<HTMLElement | null>(null)
const contextMenu = ref<{ path: string, title: string, x: number, y: number } | null>(null)
const tagsScrollRef = ref<{ wrapRef: HTMLElement | null, update: () => void } | null>(null)

function getTagIndex(path: string) {
  return tags.value.findIndex(tag => tag.path === path)
}

function resolveTagIcon(path: string) {
  return resolveIcon(navigation.findItem(path)?.icon)
}

function tagId(path: string) {
  return encodeURIComponent(path)
}

async function scrollActiveTagIntoView() {
  await nextTick()
  tagsScrollRef.value?.update?.()
  const wrap = tagsScrollRef.value?.wrapRef
  if (!wrap) {
    return
  }

  const current = wrap.querySelector(`[data-tag-id="${tagId(activePath.value)}"]`) as HTMLElement | null
  current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
}

function canCloseCurrentFor(path: string) {
  return path !== '/index'
}

function canCloseLeftFor(path: string) {
  return getTagIndex(path) > 1
}

function canCloseRightFor(path: string) {
  const index = getTagIndex(path)
  return index >= 0 && index < tags.value.length - 1
}

function canCloseOthersFor(path: string) {
  return tags.value.some(tag => tag.path !== '/index' && tag.path !== path)
}

function closeContextMenu() {
  contextMenu.value = null
}

async function refreshTag(path: string) {
  closeContextMenu()

  if (route.path !== path) {
    await router.push(path)
  }

  const normalizedPath = path.replace(/^\/+/, '')
  const redirectPath = normalizedPath ? `/redirect/${normalizedPath}` : '/redirect/index'
  await router.replace({
    path: redirectPath,
    query: route.path === path ? route.query : undefined,
    hash: route.path === path ? route.hash : undefined,
  })
}

function refreshCurrentTag() {
  void refreshTag(activePath.value)
}

function goToFallback() {
  const fallback = ui.visitedTags.at(-1)?.path ?? '/index'
  router.push(fallback)
}

function closeTag(path: string) {
  closeContextMenu()
  const wasActive = activePath.value === path
  ui.removeTag(path)

  if (!wasActive) {
    return
  }

  goToFallback()
}

function closeCurrentTag() {
  if (!canCloseCurrent.value) {
    return
  }
  closeTag(activePath.value)
}

function closeLeftTags() {
  closeContextMenu()
  ui.closeLeftTags(activePath.value)
}

function closeRightTags() {
  closeContextMenu()
  ui.closeRightTags(activePath.value)
}

function closeOtherTags() {
  closeContextMenu()
  ui.closeOtherTags(activePath.value)
}

function closeAllTags() {
  closeContextMenu()
  ui.closeAllTags()
  if (activePath.value !== '/index') {
    router.push('/index')
  }
}

function ensureActivePath(path: string) {
  if (!ui.visitedTags.some(tag => tag.path === activePath.value)) {
    router.push(path)
  }
}

function closeLeftOf(path: string) {
  closeContextMenu()
  ui.closeLeftTags(path)
  ensureActivePath(path)
}

function closeRightOf(path: string) {
  closeContextMenu()
  ui.closeRightTags(path)
  ensureActivePath(path)
}

function closeOthersFor(path: string) {
  closeContextMenu()
  ui.closeOtherTags(path)
  if (activePath.value !== path && activePath.value !== '/index') {
    router.push(path)
  }
}

function openContextMenu(tag: { path: string, title: string }, event: MouseEvent) {
  const menuWidth = 196
  const menuHeight = 252
  const gutter = 12
  contextMenu.value = {
    path: tag.path,
    title: tag.title,
    x: Math.max(gutter, Math.min(event.clientX, window.innerWidth - menuWidth - gutter)),
    y: Math.max(gutter, Math.min(event.clientY, window.innerHeight - menuHeight - gutter)),
  }
}

function handleWindowPointerDown(event: PointerEvent) {
  if (!contextMenu.value) {
    return
  }

  const target = event.target as Node | null
  if (target && contextMenuRef.value?.contains(target)) {
    return
  }

  closeContextMenu()
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeContextMenu()
  }
}

onMounted(() => {
  window.addEventListener('pointerdown', handleWindowPointerDown)
  window.addEventListener('keydown', handleWindowKeydown)
  window.addEventListener('resize', closeContextMenu)
  window.addEventListener('scroll', closeContextMenu, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handleWindowPointerDown)
  window.removeEventListener('keydown', handleWindowKeydown)
  window.removeEventListener('resize', closeContextMenu)
  window.removeEventListener('scroll', closeContextMenu, true)
})

watch(activePath, closeContextMenu)
watch([activePath, () => tags.value.map(tag => tag.path).join('|')], () => {
  void scrollActiveTagIntoView()
}, { immediate: true })
</script>

<template>
  <div class="border-b border-border/60 bg-background/80 backdrop-blur-xl">
    <div class="mx-auto flex max-w-[1600px] items-center gap-2 px-2.5 py-1.5 sm:px-3 md:gap-3 md:px-6 md:py-2">
      <OverlayScrollbar
        ref="tagsScrollRef"
        orientation="horizontal"
        wheel-to-horizontal
        class="min-w-0 flex-1"
        viewport-class="pb-1"
        view-class="flex w-max min-w-full items-center gap-1.5 pr-2 md:gap-2"
      >
        <Button
          v-for="tag in tags"
          :key="tag.path"
          :data-tag-id="tagId(tag.path)"
          :variant="activePath === tag.path ? 'default' : 'ghost'"
          class="h-8 shrink-0 gap-1.5 px-2 text-xs sm:px-2.5 md:h-9 md:px-3 md:text-sm"
          @click="router.push(tag.path)"
          @contextmenu.prevent="openContextMenu(tag, $event)"
        >
          <component v-if="showTagIcons" :is="resolveTagIcon(tag.path)" class="size-3.5 shrink-0 md:size-4" />
          <span class="truncate">{{ tag.title }}</span>
          <span
            v-if="tag.path !== '/index'"
            class="ml-1 items-center justify-center rounded-full text-muted-foreground transition hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
            :class="activePath === tag.path ? 'inline-flex size-4' : 'hidden size-4 sm:inline-flex'"
            @click.stop="closeTag(tag.path)"
          >
            <X class="size-3" />
          </span>
        </Button>
      </OverlayScrollbar>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="icon" class="shrink-0">
            <Ellipsis class="size-4" />
            <span class="sr-only">标签页操作</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-44">
          <DropdownMenuItem @select.prevent="refreshCurrentTag">
            <RefreshCw class="size-4" />
            刷新当前页
          </DropdownMenuItem>
          <DropdownMenuItem :disabled="!canCloseCurrent" @select.prevent="closeCurrentTag">
            <X class="size-4" />
            关闭当前页
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem :disabled="!canCloseLeft" @select.prevent="closeLeftTags">
            关闭左侧页
          </DropdownMenuItem>
          <DropdownMenuItem :disabled="!canCloseRight" @select.prevent="closeRightTags">
            关闭右侧页
          </DropdownMenuItem>
          <DropdownMenuItem :disabled="!canCloseOthers" @select.prevent="closeOtherTags">
            关闭其他页
          </DropdownMenuItem>
          <DropdownMenuItem :disabled="!canCloseAll" @select.prevent="closeAllTags">
            关闭全部页
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Teleport to="body">
        <div
          v-if="contextMenu"
          ref="contextMenuRef"
          class="fixed z-140 w-48 rounded-(--radius-lg) border border-border/70 bg-popover p-1 text-popover-foreground shadow-lg backdrop-blur-xl"
          :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
        >
          <div class="px-2 py-1.5 text-xs text-muted-foreground">
            标签页：{{ contextMenu.title }}
          </div>
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-(--radius-sm) px-2 py-1.5 text-left text-sm transition hover:bg-accent hover:text-accent-foreground"
            @click="void refreshTag(contextMenu.path)"
          >
            <RefreshCw class="size-4" />
            刷新当前页
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-(--radius-sm) px-2 py-1.5 text-left text-sm transition hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            :disabled="!canCloseCurrentFor(contextMenu.path)"
            @click="closeTag(contextMenu.path)"
          >
            <X class="size-4" />
            关闭当前页
          </button>
          <div class="my-1 h-px bg-border/70" />
          <button
            type="button"
            class="flex w-full items-center rounded-(--radius-sm) px-2 py-1.5 text-left text-sm transition hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            :disabled="!canCloseLeftFor(contextMenu.path)"
            @click="closeLeftOf(contextMenu.path)"
          >
            关闭左侧页
          </button>
          <button
            type="button"
            class="flex w-full items-center rounded-(--radius-sm) px-2 py-1.5 text-left text-sm transition hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            :disabled="!canCloseRightFor(contextMenu.path)"
            @click="closeRightOf(contextMenu.path)"
          >
            关闭右侧页
          </button>
          <button
            type="button"
            class="flex w-full items-center rounded-(--radius-sm) px-2 py-1.5 text-left text-sm transition hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            :disabled="!canCloseOthersFor(contextMenu.path)"
            @click="closeOthersFor(contextMenu.path)"
          >
            关闭其他页
          </button>
          <button
            type="button"
            class="flex w-full items-center rounded-(--radius-sm) px-2 py-1.5 text-left text-sm transition hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            :disabled="!canCloseAll"
            @click="closeAllTags"
          >
            关闭全部页
          </button>
        </div>
      </Teleport>
    </div>
  </div>
</template>
