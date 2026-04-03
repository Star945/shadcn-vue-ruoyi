<script setup lang="ts">
import { computed } from 'vue'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { useUiStore } from '@/stores/ui'
import { getThemePreset } from '@/theme'
import { themePresets } from '@/theme/presets'

const ui = useUiStore()

const preset = computed(() => getThemePreset(ui.themePresetId))
const customTheme = computed(() => ui.customTheme)
const layout = computed(() => ui.layout)

const layoutOptions = [
  {
    key: 'topNav',
    title: '顶部导航',
    description: '切换一级分组。',
  },
  {
    key: 'tagsView',
    title: '标签页栏',
    description: '保留标签切换。',
  },
  {
    key: 'tagsIcon',
    title: '显示页签图标',
    description: '在标签页显示图标。',
  },
  {
    key: 'fixedHeader',
    title: '固定顶部栏',
    description: '滚动时固定头部。',
  },
  {
    key: 'showLogo',
    title: '显示品牌标识',
    description: '显示左上角品牌区。',
  },
  {
    key: 'dynamicTitle',
    title: '动态标题',
    description: '同步浏览器标题。',
  },
  {
    key: 'footer',
    title: '底部版权',
    description: '显示底部信息。',
  },
] as const
</script>

<template>
  <Sheet :open="ui.themeSheetOpen" @update:open="ui.setThemeSheetOpen">
    <SheetContent side="right" class="flex h-svh w-full flex-col overflow-hidden border-l border-border/70 bg-background/95 p-0 sm:max-w-[440px]">
      <SheetHeader class="shrink-0 px-6 pt-6">
        <SheetTitle>界面设置</SheetTitle>
        <SheetDescription>调整主题和布局。</SheetDescription>
      </SheetHeader>

      <div class="flex-1 overflow-y-auto surface-scrollbar px-6 py-6">
        <div class="space-y-6 pr-1">
          <section class="space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium">外观模式</p>
                <p class="text-xs text-muted-foreground">跟随全局主题。</p>
              </div>
              <Badge variant="outline">{{ ui.theme === 'dark' ? '暗色' : '亮色' }}</Badge>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <Button :variant="ui.theme === 'light' ? 'default' : 'outline'" @click="ui.setTheme('light')">浅色模式</Button>
              <Button :variant="ui.theme === 'dark' ? 'default' : 'outline'" @click="ui.setTheme('dark')">深色模式</Button>
            </div>
          </section>

          <Separator />

          <section class="space-y-3">
            <div>
              <p class="text-sm font-medium">主题预设</p>
              <p class="text-xs text-muted-foreground">当前预设：{{ preset.name }}</p>
            </div>
            <div class="grid gap-3">
              <button
                v-for="item in themePresets"
                :key="item.id"
                type="button"
                class="rounded-3xl border p-4 text-left transition hover:border-primary/50 hover:bg-muted/40"
                :class="ui.themePresetId === item.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/70 bg-card/60'"
                @click="ui.setThemePreset(item.id)"
              >
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="font-medium">{{ item.name }}</p>
                    <p class="mt-1 text-xs text-muted-foreground">{{ item.description }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="size-4 rounded-full border border-white/50" :style="{ backgroundColor: (ui.theme === 'dark' ? item.dark.primary : item.light.primary) }" />
                    <span class="size-4 rounded-full border border-white/50" :style="{ backgroundColor: (ui.theme === 'dark' ? item.dark.accent : item.light.accent) }" />
                    <span class="size-4 rounded-full border border-white/50" :style="{ backgroundColor: (ui.theme === 'dark' ? item.dark.sidebarPrimary : item.light.sidebarPrimary) }" />
                  </div>
                </div>
              </button>
            </div>
          </section>

          <Separator />

          <section class="space-y-4">
            <div>
              <p class="text-sm font-medium">系统布局</p>
              <p class="text-xs text-muted-foreground">切换后立即生效。</p>
            </div>
            <div class="rounded-3xl border border-border/70 bg-card/60 p-4">
              <div class="space-y-4">
                <div
                  v-for="item in layoutOptions"
                  :key="item.key"
                  class="flex items-start justify-between gap-4"
                >
                  <div class="space-y-1 pr-2">
                    <p class="text-sm font-medium">{{ item.title }}</p>
                    <p class="text-xs leading-5 text-muted-foreground">{{ item.description }}</p>
                  </div>
                  <Switch
                    :model-value="layout[item.key]"
                    class="mt-0.5"
                    @update:model-value="(value) => ui.setLayoutSetting(item.key, Boolean(value))"
                  />
                </div>
              </div>
            </div>
          </section>

          <Separator />

          <section class="space-y-4">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-sm font-medium">自定义主题</p>
                <p class="text-xs text-muted-foreground">覆盖当前预设。</p>
              </div>
              <Button :variant="ui.useCustomTheme ? 'default' : 'outline'" size="sm" @click="ui.setUseCustomTheme(!ui.useCustomTheme)">
                {{ ui.useCustomTheme ? '开启' : '关闭' }}
              </Button>
            </div>

            <div class="grid gap-4 rounded-3xl border border-border/70 bg-card/60 p-4">
              <label class="space-y-2 text-sm">
                <span class="font-medium">主色</span>
                <div class="flex items-center gap-3">
                  <input class="h-10 w-14 rounded-xl border border-border bg-transparent p-1" type="color" :value="customTheme.primary" @input="ui.updateCustomTheme({ primary: ($event.target as HTMLInputElement).value })">
                  <div class="flex h-10 flex-1 items-center rounded-2xl border border-border/70 bg-background/75 px-3 text-sm text-foreground">{{ customTheme.primary.toUpperCase() }}</div>
                </div>
              </label>

              <label class="space-y-2 text-sm">
                <span class="font-medium">强调色</span>
                <div class="flex items-center gap-3">
                  <input class="h-10 w-14 rounded-xl border border-border bg-transparent p-1" type="color" :value="customTheme.accent" @input="ui.updateCustomTheme({ accent: ($event.target as HTMLInputElement).value })">
                  <div class="flex h-10 flex-1 items-center rounded-2xl border border-border/70 bg-background/75 px-3 text-sm text-foreground">{{ customTheme.accent.toUpperCase() }}</div>
                </div>
              </label>

              <label class="space-y-2 text-sm">
                <span class="font-medium">侧栏主色</span>
                <div class="flex items-center gap-3">
                  <input class="h-10 w-14 rounded-xl border border-border bg-transparent p-1" type="color" :value="customTheme.sidebarPrimary" @input="ui.updateCustomTheme({ sidebarPrimary: ($event.target as HTMLInputElement).value })">
                  <div class="flex h-10 flex-1 items-center rounded-2xl border border-border/70 bg-background/75 px-3 text-sm text-foreground">{{ customTheme.sidebarPrimary.toUpperCase() }}</div>
                </div>
              </label>

              <label class="space-y-2 text-sm">
                <span class="font-medium">圆角半径</span>
                <div class="space-y-2">
                  <input class="w-full accent-[var(--theme-primary)]" type="range" min="0" max="28" step="1" :value="customTheme.radius" @input="ui.updateCustomTheme({ radius: Number(($event.target as HTMLInputElement).value) })">
                  <div class="flex items-center justify-between text-xs text-muted-foreground">
                    <span>完全直角</span>
                    <span>{{ customTheme.radius }}px</span>
                    <span>控件同步变化</span>
                  </div>
                </div>
              </label>
            </div>

            <div class="rounded-3xl border border-border/70 bg-muted/25 p-4">
              <p class="text-sm font-medium">当前效果</p>
              <div class="mt-3 flex items-center gap-3">
                <span class="size-9 rounded-2xl" :style="{ backgroundColor: customTheme.primary }" />
                <span class="size-9 rounded-2xl" :style="{ backgroundColor: customTheme.accent }" />
                <span class="size-9 rounded-2xl" :style="{ backgroundColor: customTheme.sidebarPrimary }" />
              </div>
            </div>
          </section>
        </div>
      </div>

      <div class="shrink-0 border-t border-border/70 bg-background/90 px-6 py-4 backdrop-blur-xl">
        <div class="flex gap-2">
          <Button variant="outline" class="flex-1" @click="ui.resetThemeConfig">恢复默认</Button>
          <Button class="flex-1" @click="ui.setThemeSheetOpen(false)">完成</Button>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>










