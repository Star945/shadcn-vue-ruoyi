<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { Toaster } from '@/components/ui/sonner'
import { pinia } from '@/stores'
import { useNavigationStore } from '@/stores/navigation'
import { usePermissionStore } from '@/stores/permission'
import { useSessionStore } from '@/stores/session'
import { useUiStore } from '@/stores/ui'

const appTitle = 'RuoYi Modern 后台'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const session = useSessionStore(pinia)
const navigation = useNavigationStore(pinia)
const permission = usePermissionStore(pinia)
const currentTitle = computed(() => String(route.meta.title ?? ''))

function syncDocumentTitle() {
  if (typeof document === 'undefined') {
    return
  }
  document.title = ui.layout.dynamicTitle && currentTitle.value
    ? `${currentTitle.value} - ${appTitle}`
    : appTitle
}

function isSafeRedirectPath(path: string) {
  return path.startsWith('/') && !path.startsWith('//')
}

async function handleUnauthorized(event: Event) {
  const detail = event instanceof CustomEvent ? event.detail as { message?: string } | undefined : undefined
  const redirect = isSafeRedirectPath(route.fullPath) ? route.fullPath : '/index'

  permission.resetRoutes(router)
  navigation.$reset()
  session.clearSession()
  ui.resetTags()

  toast.error('登录状态已过期', {
    description: detail?.message || '请重新登录后继续访问。',
  })

  if (route.path !== '/login') {
    await router.replace({ path: '/login', query: { redirect } })
  }
}

watch(() => [route.fullPath, currentTitle.value, ui.layout.dynamicTitle], syncDocumentTitle, { immediate: true })

onMounted(() => {
  window.addEventListener('auth:unauthorized', handleUnauthorized as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('auth:unauthorized', handleUnauthorized as EventListener)
})
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
  <Toaster rich-colors position="top-right" />
</template>
