<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const session = useSessionStore()
const form = reactive({ password: '' })

const avatarText = computed(() => session.user.avatar || 'RY')

function unlock() {
  if (!form.password.trim()) {
    toast.error('请输入密码后再解锁')
    return
  }

  session.unlock()
  toast.success('已解锁当前工作区')
  router.push('/index')
}
</script>

<template>
  <div class="flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_center,var(--surface-glow-primary),transparent_26%),linear-gradient(180deg,#0b1626,#09111d)] px-4">
    <Card class="w-full max-w-md border-white/10 bg-white/8 text-white shadow-[0_28px_80px_rgba(0,0,0,0.35)] backdrop-blur">
      <CardHeader>
        <CardTitle class="text-3xl">锁屏</CardTitle>
        <CardDescription class="text-white/70">解锁后返回原页面。</CardDescription>
      </CardHeader>
      <CardContent class="space-y-5">
        <div class="flex items-center gap-4">
          <div class="flex size-20 items-center justify-center rounded-3xl bg-white/10 text-xl font-semibold">
            {{ avatarText }}
          </div>
          <div>
            <p class="text-lg font-semibold">{{ session.user.name }}</p>
            <p class="text-sm text-white/60">{{ session.user.role }}</p>
          </div>
        </div>

        <Input
          v-model="form.password"
          type="password"
          class="h-12 border-white/15 bg-white/6 text-white placeholder:text-white/40"
          placeholder="请输入密码"
          @keyup.enter="unlock"
        />

        <div class="flex gap-3">
          <Button
            variant="outline"
            class="h-12 flex-1 border-white/15 bg-white/8 text-white hover:bg-white/12"
            @click="router.push('/login')"
          >
            切换账号
          </Button>
          <Button class="h-12 flex-1" @click="unlock">解锁</Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

