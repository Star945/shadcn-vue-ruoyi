<script setup lang="ts">
import { Bell, Command as CommandIcon, LockKeyhole, LogOut, MoreHorizontal, MonitorSmartphone, Palette, RefreshCw, UserRound } from 'lucide-vue-next'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { NavigationItem, NavigationNode } from '@/stores/navigation'

import AppBrand from '@/components/app/AppBrand.vue'
import NoticeCenter from '@/components/app/NoticeCenter.vue'
import ThemeToggle from '@/components/app/ThemeToggle.vue'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OverlayScrollbar } from '@/components/ui/overlay-scrollbar'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { resolveIcon } from '@/lib/icons'
import { useNavigationStore } from '@/stores/navigation'
import { useSessionStore } from '@/stores/session'
import { useUiStore } from '@/stores/ui'

const router = useRouter()
const route = useRoute()
const session = useSessionStore()
const ui = useUiStore()
const navigation = useNavigationStore()

const topGroupScrollRef = ref<{ wrapRef: HTMLElement | null, update: () => void } | null>(null)
const activeMenu = computed(() => String(route.meta.activeMenu ?? route.path))
const currentRoot = computed(() => navigation.findRoot(activeMenu.value))
const navTrail = computed(() => navigation.findTrail(activeMenu.value))
const navItem = computed(() => navigation.findItem(activeMenu.value))
const commandEntries = computed(() => [...navigation.allItems, ...navigation.quickActions])
const topGroups = computed(() => navigation.rootItems.filter(item => item.clickable || item.children.length > 0))
const pageTitle = computed(() => String(route.meta.title ?? navTrail.value.at(-1)?.title ?? navItem.value?.title ?? '工作台'))
const pageSubtitle = computed(() => {
  const titles = navTrail.value.map(item => item.title)
  if (ui.layout.topNav) {
    return titles.length > 1 ? titles.slice(0, -1).join(' / ') : currentRoot.value?.title ?? '后台导航'
  }
  return titles.length > 1 ? titles.slice(0, -1).join(' / ') : String(route.meta.title ?? '')
})

const breadcrumbItems = computed(() => {
  const items = navTrail.value.map(item => item.title)
  const routeTitle = String(route.meta.title ?? '').trim()

  if (!items.length && route.path === '/index') {
    return ['工作台']
  }

  if (route.meta.hidden && routeTitle && items.at(-1) !== routeTitle) {
    items.push(routeTitle)
  }

  return items
})

function topGroupId(path: string) {
  return encodeURIComponent(path)
}

async function scrollActiveGroupIntoView() {
  await nextTick()
  topGroupScrollRef.value?.update?.()
  const wrap = topGroupScrollRef.value?.wrapRef
  const currentPath = currentRoot.value?.path
  if (!wrap || !currentPath) {
    return
  }

  const activeItem = wrap.querySelector(`[data-group-id="${topGroupId(currentPath)}"]`) as HTMLElement | null
  activeItem?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
}

function openExternal(url: string) {
  if (typeof window === 'undefined') {
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

function navigate(item: NavigationItem) {
  ui.setCommandOpen(false)
  if (item.external) {
    openExternal(item.path)
    return
  }
  router.push(item.path)
}

function goToNode(node: NavigationNode) {
  const target = navigation.resolveNodeTarget(node)
  if (!target) {
    return
  }
  navigate(target)
}

function refreshCurrentRoute() {
  const normalizedPath = route.path.replace(/^\/+/, '')
  const redirectPath = normalizedPath ? `/redirect/${normalizedPath}` : '/redirect/index'
  router.replace({
    path: redirectPath,
    query: route.query,
    hash: route.hash,
  })
}

async function logout() {
  await session.logout()
  ui.resetTags()
  router.push('/login')
}

function lockScreen() {
  ui.setCommandOpen(false)
  session.lock()
  router.push('/lock')
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    ui.setCommandOpen(!ui.commandOpen)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

watch(() => currentRoot.value?.path ?? '', () => {
  void scrollActiveGroupIntoView()
}, { immediate: true })
</script>

<template>
  <header class="border-b border-border/50 bg-background/72 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.34)] backdrop-blur-2xl transition-all">
    <div class="mx-auto flex min-h-14 items-center gap-2 px-3 py-2 md:min-h-16 md:gap-3 md:px-6">
      <SidebarTrigger class="-ml-1" />
      <Separator orientation="vertical" class="hidden h-5 sm:flex" />

      <div class="min-w-0 flex-1 sm:hidden">
        <p class="truncate text-sm font-semibold">{{ pageTitle }}</p>
        <p class="truncate text-[11px] text-muted-foreground">{{ currentRoot?.title ?? '后台导航' }}</p>
      </div>

      <div v-if="ui.layout.topNav && ui.layout.showLogo" class="hidden shrink-0 items-center md:flex">
        <AppBrand class="hidden text-foreground xl:flex" />
        <AppBrand compact class="text-foreground xl:hidden" />
      </div>

      <div class="hidden min-w-0 flex-1 md:block">
        <template v-if="ui.layout.topNav">
          <p class="truncate text-sm font-semibold tracking-tight">{{ pageTitle }}</p>
          <p class="truncate text-xs text-muted-foreground">{{ pageSubtitle }}</p>
        </template>
        <template v-else>
          <Breadcrumb>
            <BreadcrumbList>
              <template v-for="(item, index) in breadcrumbItems" :key="`${item}-${index}`">
                <BreadcrumbSeparator v-if="index > 0" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{{ item }}</BreadcrumbPage>
                </BreadcrumbItem>
              </template>
            </BreadcrumbList>
          </Breadcrumb>
          <p class="truncate text-xs text-muted-foreground">{{ pageSubtitle }}</p>
        </template>
      </div>

      <div class="ml-auto flex items-center gap-1.5 sm:gap-2">
        <Button variant="outline" size="icon" class="hidden md:inline-flex" @click="refreshCurrentRoute">
          <RefreshCw class="size-4" />
          <span class="sr-only">刷新当前页</span>
        </Button>

        <Button variant="outline" size="icon" class="md:hidden" @click="ui.setCommandOpen(true)">
          <CommandIcon class="size-4" />
          <span class="sr-only">搜索命令</span>
        </Button>

        <Button variant="outline" class="hidden text-muted-foreground md:flex" @click="ui.setCommandOpen(true)">
          <CommandIcon class="mr-2 size-4" />
          <span>搜索 <kbd class="ml-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">⌘K</kbd></span>
        </Button>

        <div class="hidden items-center gap-1.5 md:flex md:gap-2">
          <ThemeToggle />
          <NoticeCenter />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" class="hidden px-2 sm:inline-flex sm:px-3 md:max-w-[14rem]">
              <UserRound class="size-4 sm:mr-2" />
              <span class="hidden max-w-28 truncate md:inline-block lg:max-w-40">{{ session.user.name }}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-56">
            <DropdownMenuItem @select.prevent="router.push('/user/profile')">
              <UserRound class="size-4" />
              个人中心
            </DropdownMenuItem>
            <DropdownMenuItem @select.prevent="lockScreen">
              <LockKeyhole class="size-4" />
              锁屏
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" @select.prevent="logout">
              <LogOut class="size-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" size="icon" class="md:hidden">
              <MoreHorizontal class="size-4" />
              <span class="sr-only">更多操作</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-[min(18rem,calc(100vw-1rem))] sm:w-56">
            <DropdownMenuItem @select.prevent="refreshCurrentRoute">
              <RefreshCw class="size-4" />
              刷新当前页
            </DropdownMenuItem>
            <DropdownMenuItem @select.prevent="ui.toggleTheme()">
              <MonitorSmartphone class="size-4" />
              切换{{ ui.theme === 'dark' ? '浅色' : '暗色' }}模式
            </DropdownMenuItem>
            <DropdownMenuItem @select.prevent="ui.setThemeSheetOpen(true)">
              <Palette class="size-4" />
              界面设置
            </DropdownMenuItem>
            <DropdownMenuItem @select.prevent="router.push('/system/notice')">
              <Bell class="size-4" />
              公告中心
            </DropdownMenuItem>

            <template v-if="ui.layout.topNav && topGroups.length">
              <DropdownMenuSeparator />
              <DropdownMenuLabel>切换栏目</DropdownMenuLabel>
              <DropdownMenuItem
                v-for="item in topGroups"
                :key="`mobile-group-${item.title}`"
                :class="currentRoot?.path === item.path ? 'bg-accent/60 font-medium' : ''"
                @select.prevent="goToNode(item)"
              >
                <component :is="resolveIcon(item.icon)" class="size-4" />
                {{ item.title }}
              </DropdownMenuItem>
            </template>

            <DropdownMenuSeparator />
            <DropdownMenuItem @select.prevent="router.push('/user/profile')">
              <UserRound class="size-4" />
              个人中心
            </DropdownMenuItem>
            <DropdownMenuItem @select.prevent="lockScreen">
              <LockKeyhole class="size-4" />
              锁屏
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" @select.prevent="logout">
              <LogOut class="size-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <div v-if="ui.layout.topNav" class="border-t border-border/40 md:block">
      <div class="mx-auto max-w-[1600px] px-3 sm:px-4 md:px-6">
        <OverlayScrollbar
          ref="topGroupScrollRef"
          orientation="horizontal"
          wheel-to-horizontal
          class="w-full"
          viewport-class="pb-1"
          view-class="flex w-max min-w-full items-center gap-2 py-2"
        >
          <Button
            v-for="item in topGroups"
            :key="item.path"
            :data-group-id="topGroupId(item.path)"
            :variant="currentRoot?.path === item.path ? 'default' : 'outline'"
            class="h-8 shrink-0 gap-2 px-2.5 text-xs shadow-none sm:h-9 sm:px-3 sm:text-sm"
            @click="goToNode(item)"
          >
            <component :is="resolveIcon(item.icon)" class="size-4" />
            <span>{{ item.title }}</span>
          </Button>
        </OverlayScrollbar>
      </div>
    </div>
  </header>

  <CommandDialog :open="ui.commandOpen" @update:open="ui.setCommandOpen">
    <CommandInput placeholder="搜索菜单、页面或快捷入口..." />
    <CommandList>
      <CommandEmpty>没有匹配的菜单。</CommandEmpty>
      <CommandGroup heading="菜单导航">
        <CommandItem
          v-for="item in commandEntries"
          :key="`${item.path}-${item.title}`"
          :value="item.title"
          @select="navigate(item)"
        >
          <component :is="resolveIcon(item.icon)" class="mr-2 size-4" />
          <span>{{ item.title }}</span>
        </CommandItem>
      </CommandGroup>
      <CommandGroup heading="外观设置">
        <CommandItem value="toggle-theme切换亮暗模式" @select="ui.toggleTheme(); ui.setCommandOpen(false)">
          <MonitorSmartphone class="mr-2 size-4" />
          <span>切换暗色 / 亮色模式</span>
        </CommandItem>
        <CommandItem value="set-theme紫金华录" @select="ui.setThemePreset('amethyst-glow'); ui.setCommandOpen(false)">
          <Palette class="mr-2 size-4" />
          <span>应用主题: 紫金华录</span>
        </CommandItem>
        <CommandItem value="set-theme极夜蓝光" @select="ui.setThemePreset('midnight-aurora'); ui.setCommandOpen(false)">
          <Palette class="mr-2 size-4" />
          <span>应用主题: 极夜蓝光</span>
        </CommandItem>
      </CommandGroup>
      <CommandGroup heading="系统运行">
        <CommandItem value="lock-screen锁定屏幕" @select="lockScreen">
          <LockKeyhole class="mr-2 size-4" />
          <span>锁定屏幕</span>
        </CommandItem>
        <CommandItem value="logout退出登录" @select="logout">
          <LogOut class="mr-2 size-4 text-destructive" />
          <span class="text-destructive">退出登录</span>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>
