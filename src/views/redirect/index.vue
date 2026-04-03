<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const redirectPath = computed(() => {
  const value = route.params.path
  const normalized = Array.isArray(value) ? value.join('/') : String(value ?? '')
  return normalized ? `/${normalized}` : '/index'
})

onMounted(() => {
  router.replace({
    path: redirectPath.value,
    query: route.query,
    hash: route.hash,
  })
})
</script>

<template>
  <div class="sr-only" aria-hidden="true">正在跳转</div>
</template>
