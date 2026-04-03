<script setup lang="ts">
import { Palette, MoonStar, SunMedium } from 'lucide-vue-next'
import { computed } from 'vue'

import ThemeCustomizer from '@/components/app/ThemeCustomizer.vue'
import { Button } from '@/components/ui/button'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const modeLabel = computed(() => ui.theme === 'dark' ? '暗色' : '亮色')
</script>

<template>
  <div class="flex items-center gap-2">
    <Button variant="outline" size="icon" @click="ui.toggleTheme()">
      <SunMedium v-if="ui.theme === 'dark'" class="size-4" />
      <MoonStar v-else class="size-4" />
      <span class="sr-only">切换明暗模式</span>
    </Button>

    <Button variant="outline" class="hidden px-3 md:flex" @click="ui.setThemeSheetOpen(true)">
      <Palette class="mr-2 size-4" />
      界面 · {{ modeLabel }}
    </Button>

    <Button variant="ghost" size="icon" class="md:hidden" @click="ui.setThemeSheetOpen(true)">
      <Palette class="size-4" />
      <span class="sr-only">打开界面设置</span>
    </Button>
  </div>

  <ThemeCustomizer />
</template>
