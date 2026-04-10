<script setup lang="ts">
import { computed } from 'vue'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { getThemePreset, resolveThemeVisuals } from '@/theme'
import { useUiStore } from '@/stores/ui'
import { themePresets } from '@/theme/presets'

const ui = useUiStore()

const preset = computed(() => getThemePreset(ui.themePresetId))
const customTheme = computed(() => ui.customTheme)
const layout = computed(() => ui.layout)
const activeVisuals = computed(() => resolveThemeVisuals(ui.themeApplication))

const layoutOptions = [
  {
    key: 'topNav',
    title: '顶部导航',
    description: '把一级栏目切到头部展示。',
  },
  {
    key: 'tagsView',
    title: '标签页栏',
    description: '保留多页签切换。',
  },
  {
    key: 'tagsIcon',
    title: '页签图标',
    description: '在标签页里显示页面图标。',
  },
  {
    key: 'fixedHeader',
    title: '固定顶部栏',
    description: '滚动时保持顶部区域固定。',
  },
  {
    key: 'showLogo',
    title: '显示品牌区',
    description: '在左上角保留品牌入口。',
  },
  {
    key: 'dynamicTitle',
    title: '动态标题',
    description: '同步浏览器标题与当前页面。',
  },
  {
    key: 'footer',
    title: '底部版权',
    description: '显示底部信息栏。',
  },
] as const

function presetVisuals(presetId: string) {
  return resolveThemeVisuals({
    mode: ui.theme,
    presetId,
  })
}

function previewSurfaceStyle(presetId: string) {
  const visuals = presetVisuals(presetId)
  return {
    background: `radial-gradient(circle at top right, ${visuals.glowPrimary}, transparent 44%), radial-gradient(circle at bottom left, ${visuals.glowSecondary}, transparent 36%), linear-gradient(145deg, color-mix(in oklab, ${visuals.sidebarPrimary} 14%, white), color-mix(in oklab, ${visuals.primary} 8%, white))`,
  }
}

function previewSidebarStyle(presetId: string) {
  const visuals = presetVisuals(presetId)
  return {
    background: `linear-gradient(180deg, ${visuals.sidebarPrimary}, color-mix(in oklab, ${visuals.sidebarPrimary} 74%, ${visuals.primary}))`,
  }
}

function previewLineStyle(presetId: string) {
  const visuals = presetVisuals(presetId)
  return {
    background: `linear-gradient(90deg, ${visuals.chartLineStart}, ${visuals.chartLineEnd})`,
    boxShadow: `0 10px 24px -16px ${visuals.glowPrimary}`,
  }
}

function previewChipStyle(presetId: string, kind: 'primary' | 'accent' | 'sidebar') {
  const visuals = presetVisuals(presetId)
  const color = kind === 'primary' ? visuals.primary : kind === 'accent' ? visuals.accent : visuals.sidebarPrimary
  const foreground = kind === 'primary'
    ? visuals.primaryForeground
    : kind === 'accent'
      ? visuals.accentForeground
      : visuals.sidebarPrimaryForeground

  return {
    backgroundColor: color,
    color: foreground,
  }
}
</script>

<template>
  <Sheet :open="ui.themeSheetOpen" @update:open="ui.setThemeSheetOpen">
    <SheetContent side="right" class="flex h-svh w-full flex-col overflow-hidden border-l border-border/70 bg-background/96 p-0 sm:max-w-[460px]">
      <SheetHeader class="shrink-0 px-6 pt-6">
        <SheetTitle>界面设置</SheetTitle>
        <SheetDescription>调整主题、品牌和布局风格。</SheetDescription>
      </SheetHeader>

      <div class="flex-1 overflow-y-auto surface-scrollbar px-6 py-6">
        <div class="space-y-6 pr-1">
          <section class="space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium">外观模式</p>
                <p class="text-xs text-muted-foreground">切换明暗模式。</p>
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
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-medium">主题预设</p>
                <p class="text-xs text-muted-foreground">当前预设：{{ preset.name }}</p>
              </div>
              <Badge variant="secondary">活泼版</Badge>
            </div>

            <div class="grid gap-3">
              <button
                v-for="item in themePresets"
                :key="item.id"
                type="button"
                class="group rounded-[calc(var(--radius)*1.25)] border p-3 text-left transition duration-300 hover:-translate-y-[1px] hover:border-primary/50"
                :class="ui.themePresetId === item.id ? 'border-primary bg-primary/5 shadow-[0_24px_40px_-30px_var(--surface-glow-primary)]' : 'border-border/70 bg-card/60 hover:bg-card/80'"
                @click="ui.setThemePreset(item.id)"
              >
                <div class="overflow-hidden rounded-[calc(var(--radius)*1.05)] border border-black/5 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] dark:border-white/8" :style="previewSurfaceStyle(item.id)">
                  <div class="grid grid-cols-[56px_1fr] gap-3">
                    <div class="rounded-[calc(var(--radius)*0.95)] p-2.5 text-white" :style="previewSidebarStyle(item.id)">
                      <div class="mb-3 flex size-7 items-center justify-center rounded-xl bg-white/16 text-[10px] font-semibold">R</div>
                      <div class="space-y-1.5">
                        <div class="h-2 rounded-full bg-white/70" />
                        <div class="h-2 w-8 rounded-full bg-white/28" />
                        <div class="h-2 w-6 rounded-full bg-white/18" />
                      </div>
                    </div>
                    <div class="space-y-2">
                      <div class="flex items-center gap-2">
                        <span class="h-2 flex-1 rounded-full bg-white/72 dark:bg-white/18" />
                        <span class="h-2 w-10 rounded-full bg-white/48 dark:bg-white/14" />
                      </div>
                      <div class="grid grid-cols-2 gap-2">
                        <div class="rounded-2xl border border-white/45 bg-white/72 p-2.5 dark:border-white/10 dark:bg-black/18">
                          <div class="h-2 w-10 rounded-full bg-slate-300/80 dark:bg-white/12" />
                          <div class="mt-2 h-5 rounded-full" :style="previewChipStyle(item.id, 'primary')" />
                        </div>
                        <div class="rounded-2xl border border-white/45 bg-white/72 p-2.5 dark:border-white/10 dark:bg-black/18">
                          <div class="h-2 w-8 rounded-full bg-slate-300/80 dark:bg-white/12" />
                          <div class="mt-2 h-5 rounded-full" :style="previewChipStyle(item.id, 'accent')" />
                        </div>
                      </div>
                      <div class="rounded-2xl border border-white/45 bg-white/72 px-3 py-4 dark:border-white/10 dark:bg-black/18">
                        <div class="h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-white/8" />
                        <div class="mt-3 h-2 rounded-full" :style="previewLineStyle(item.id)" />
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mt-3 flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-medium">{{ item.name }}</p>
                    <p class="mt-1 text-xs leading-5 text-muted-foreground">{{ item.description }}</p>
                  </div>
                  <div class="flex shrink-0 items-center gap-1.5">
                    <span class="size-3.5 rounded-full border border-white/50 shadow-sm" :style="{ backgroundColor: (ui.theme === 'dark' ? item.dark.primary : item.light.primary) }" />
                    <span class="size-3.5 rounded-full border border-white/50 shadow-sm" :style="{ backgroundColor: (ui.theme === 'dark' ? item.dark.accent : item.light.accent) }" />
                    <span class="size-3.5 rounded-full border border-white/50 shadow-sm" :style="{ backgroundColor: (ui.theme === 'dark' ? item.dark.sidebarPrimary : item.light.sidebarPrimary) }" />
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
                    @update:model-value="value => ui.setLayoutSetting(item.key, Boolean(value))"
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
                {{ ui.useCustomTheme ? '已开启' : '已关闭' }}
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

            <div class="overflow-hidden rounded-3xl border border-border/70 bg-card/70 p-4">
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium">当前效果</p>
                <Badge variant="outline">图表同步</Badge>
              </div>
              <div class="mt-4 grid grid-cols-[72px_1fr] gap-3">
                <div class="rounded-[calc(var(--radius)*1.1)] p-3" :style="{ background: `linear-gradient(180deg, ${activeVisuals.sidebarPrimary}, color-mix(in oklab, ${activeVisuals.sidebarPrimary} 72%, ${activeVisuals.primary}))` }">
                  <div class="mb-4 size-8 rounded-2xl bg-white/14" />
                  <div class="space-y-2">
                    <div class="h-2 rounded-full bg-white/70" />
                    <div class="h-2 w-8 rounded-full bg-white/24" />
                  </div>
                </div>
                <div class="space-y-3">
                  <div class="rounded-2xl border border-border/60 bg-background/82 p-3">
                    <div class="flex items-center gap-2">
                      <span class="h-2 flex-1 rounded-full bg-muted" />
                      <span class="h-2 w-12 rounded-full bg-muted" />
                    </div>
                    <div class="mt-3 grid grid-cols-2 gap-2">
                      <span class="h-8 rounded-2xl" :style="{ backgroundColor: activeVisuals.primary }" />
                      <span class="h-8 rounded-2xl" :style="{ backgroundColor: activeVisuals.accent }" />
                    </div>
                  </div>
                  <div class="rounded-2xl border border-border/60 bg-background/82 px-3 py-4">
                    <div class="h-1.5 w-full rounded-full bg-muted" />
                    <div
                      class="mt-3 h-2 rounded-full"
                      :style="{
                        background: `linear-gradient(90deg, ${activeVisuals.chartLineStart}, ${activeVisuals.chartLineEnd})`,
                        boxShadow: `0 12px 26px -18px ${activeVisuals.glowPrimary}`,
                      }"
                    />
                  </div>
                </div>
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
