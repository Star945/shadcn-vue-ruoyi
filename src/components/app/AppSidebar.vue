<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import AppBrand from '@/components/app/AppBrand.vue'
import AppSidebarTreeItem from '@/components/app/AppSidebarTreeItem.vue'
import { resolveIcon } from '@/lib/icons'
import { useNavigationStore } from '@/stores/navigation'
import { useSessionStore } from '@/stores/session'
import { useUiStore } from '@/stores/ui'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'

const route = useRoute()
const session = useSessionStore()
const navigation = useNavigationStore()
const ui = useUiStore()

const isMobile = ref(false)
const openKeys = ref<string[]>([])
const activePath = computed(() => String(route.meta.activeMenu ?? route.path))
const roots = computed(() => navigation.rootItems)
const quickActions = computed(() => navigation.quickActions)
const currentRoot = computed(() => navigation.findRoot(activePath.value))
const visibleNodes = computed(() => {
  if (!ui.layout.topNav || isMobile.value) {
    return roots.value
  }
  if (!currentRoot.value) {
    return roots.value
  }
  return currentRoot.value.children.length ? currentRoot.value.children : [currentRoot.value]
})
const currentLabel = computed(() => ui.layout.topNav && !isMobile.value ? currentRoot.value?.title ?? '' : '')
const headerClass = computed(() => ui.layout.topNav ? 'md:hidden' : '')

function syncViewport() {
  if (typeof window === 'undefined') {
    return
  }
  isMobile.value = window.innerWidth < 768
}

function syncOpenKeys() {
  const ancestorPaths = navigation.findTrail(activePath.value).slice(0, -1).map(item => item.path)
  openKeys.value = Array.from(new Set([...openKeys.value, ...ancestorPaths]))
}

function handleToggle(payload: { path: string, open: boolean }) {
  if (payload.open) {
    openKeys.value = Array.from(new Set([...openKeys.value, payload.path]))
    return
  }
  openKeys.value = openKeys.value.filter(item => item !== payload.path)
}

onMounted(() => {
  syncViewport()
  syncOpenKeys()
  window.addEventListener('resize', syncViewport)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
})

watch(activePath, syncOpenKeys)
</script>

<template>
  <Sidebar collapsible="icon" variant="inset">
    <SidebarHeader v-if="ui.layout.showLogo" :class="headerClass">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            as-child
            size="lg"
            class="bg-transparent p-0 shadow-none ring-0 hover:bg-transparent"
          >
            <AppBrand />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel v-if="currentLabel" class="admin-kicker px-1">{{ currentLabel }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <AppSidebarTreeItem
              v-for="node in visibleNodes"
              :key="`${node.path}-${node.title}`"
              :node="node"
              :active-path="activePath"
              :open-keys="openKeys"
              @toggle="handleToggle"
            />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <SidebarGroup>
        <SidebarGroupLabel class="admin-kicker px-1">快捷入口</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in quickActions" :key="item.path">
              <SidebarMenuButton as-child :tooltip="item.title">
                <RouterLink :to="item.path">
                  <component :is="resolveIcon(item.icon)" />
                  <span>{{ item.title }}</span>
                </RouterLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarSeparator />
      <div class="rounded-[var(--radius-xl)] border border-sidebar-border/80 bg-sidebar-accent/70 p-3 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.55)] group-data-[collapsible=icon]:hidden">
        <p class="admin-kicker text-sidebar-foreground/65">当前用户</p>
        <p class="mt-2 break-all text-sm font-semibold text-sidebar-foreground">{{ session.user.name }}</p>
        <div class="mt-1 space-y-1 text-xs text-sidebar-foreground/70">
          <p class="break-all">{{ session.user.role }}</p>
          <p class="break-all">{{ session.user.dept }}</p>
        </div>
      </div>
    </SidebarFooter>

    <SidebarRail />
  </Sidebar>
</template>
