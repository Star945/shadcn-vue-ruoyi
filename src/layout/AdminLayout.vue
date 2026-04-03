<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'

import AppHeader from '@/components/app/AppHeader.vue'
import AppSidebar from '@/components/app/AppSidebar.vue'
import AppTagsView from '@/components/app/AppTagsView.vue'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const currentYear = computed(() => new Date().getFullYear())
</script>

<template>
  <div class="min-h-svh">
    <SidebarProvider class="[--sidebar-width:18rem] [--sidebar-width-icon:4.25rem]">
      <AppSidebar />
      <SidebarInset class="overflow-hidden bg-transparent">
        <div class="relative min-h-svh">
          <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--surface-glow-primary),transparent_35%),radial-gradient(circle_at_left_center,var(--surface-glow-secondary),transparent_30%),linear-gradient(180deg,var(--layout-surface-start),var(--layout-surface-end))]" />
          <div class="relative flex min-h-svh flex-col">
            <div :class="ui.layout.fixedHeader ? 'sticky top-0 z-30' : 'relative z-20'">
              <AppHeader />
              <AppTagsView v-if="ui.layout.tagsView" />
            </div>

            <main class="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-3 pb-4 pt-4 sm:px-4 sm:pb-6 sm:pt-6 md:px-6">
              <RouterView v-slot="{ Component, route }">
                <Transition name="page" mode="out-in">
                  <component :is="Component" :key="route.fullPath" />
                </Transition>
              </RouterView>
            </main>

            <footer
              v-if="ui.layout.footer"
              class="mx-auto w-full max-w-[1600px] px-3 pb-4 sm:px-4 md:px-6"
            >
              <div class="rounded-[var(--radius-xl)] border border-border/60 bg-background/70 px-4 py-3 text-center text-xs text-muted-foreground backdrop-blur-xl sm:text-sm">
                <span>© {{ currentYear }} RuoYi Modern 后台</span>
                <span class="mx-2 hidden sm:inline">·</span>
                <span class="block sm:inline">shadcn-vue + Tailwind CSS 驱动</span>
              </div>
            </footer>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  </div>
</template>
