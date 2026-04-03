<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import { Toaster } from '@/components/ui/sonner'
import { useUiStore } from '@/stores/ui'

const appTitle = 'RuoYi Modern 后台'

const route = useRoute()
const ui = useUiStore()
const currentTitle = computed(() => String(route.meta.title ?? ''))

function syncDocumentTitle() {
  if (typeof document === 'undefined') {
    return
  }
  document.title = ui.layout.dynamicTitle && currentTitle.value
    ? `${currentTitle.value} - ${appTitle}`
    : appTitle
}

watch(() => [route.fullPath, currentTitle.value, ui.layout.dynamicTitle], syncDocumentTitle, { immediate: true })
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
  <Toaster rich-colors position="top-right" />
</template>
