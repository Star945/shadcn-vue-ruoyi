<script setup lang="ts">
import { ShieldCheck, Sparkles } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { getCodeImg } from '@/api/login'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useSessionStore } from '@/stores/session'
import { RequestError } from '@/utils/request'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const form = reactive({
  username: 'admin',
  password: 'admin123',
  code: '',
  uuid: '',
  remember: true,
})

const submitting = ref(false)
const captchaEnabled = ref(true)
const captchaUrl = ref('')

const redirectPath = computed(() => typeof route.query.redirect === 'string' ? route.query.redirect : '/index')

async function loadCaptcha() {
  try {
    const response = await getCodeImg()
    captchaEnabled.value = response.captchaEnabled !== false
    form.uuid = response.uuid ?? ''
    form.code = ''
    captchaUrl.value = response.img ? `data:image/gif;base64,${response.img}` : ''
  }
  catch (error) {
    captchaEnabled.value = false
    captchaUrl.value = ''
    form.uuid = ''
    if (error instanceof RequestError) {
      toast.error('验证码加载失败', { description: error.message })
    }
  }
}

async function submit() {
  if (!form.username.trim() || !form.password.trim()) {
    toast.error('请输入用户名和密码')
    return
  }

  if (captchaEnabled.value && !form.code.trim()) {
    toast.error('请输入验证码')
    return
  }

  submitting.value = true
  try {
    await session.login({
      username: form.username.trim(),
      password: form.password,
      code: captchaEnabled.value ? form.code.trim() : undefined,
      uuid: captchaEnabled.value ? form.uuid : undefined,
    })
    toast.success('登录成功', { description: '欢迎回来。' })
    router.push(redirectPath.value)
  }
  catch (error) {
    const message = error instanceof RequestError ? error.message : '登录失败'
    toast.error('登录失败', { description: message })
    await loadCaptcha()
  }
  finally {
    submitting.value = false
  }
}

onMounted(loadCaptcha)
</script>

<template>
  <div class="min-h-svh bg-[radial-gradient(circle_at_top_left,var(--surface-glow-primary),transparent_28%),radial-gradient(circle_at_bottom_right,var(--surface-glow-secondary),transparent_24%),linear-gradient(180deg,#f6f3ed,#f3f6f7)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top_left,var(--surface-glow-primary),transparent_24%),radial-gradient(circle_at_bottom_right,var(--surface-glow-secondary),transparent_22%),linear-gradient(180deg,#07111d,#0b1728)]">
    <div class="mx-auto grid max-w-6xl items-center gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div class="hidden rounded-[32px] border border-white/60 bg-white/70 p-8 shadow-[0_40px_100px_rgba(15,23,42,0.12)] backdrop-blur lg:block dark:border-white/10 dark:bg-white/6">
        <div class="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <Sparkles class="size-4 text-primary" />
          shadcn-vue + Tailwind CSS 现代主题
        </div>
        <h1 class="mt-6 text-5xl font-semibold leading-tight tracking-tight">后台管理系统</h1>
        <p class="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
          登录后会进入工作台。
        </p>
        <div class="mt-8 rounded-3xl border border-border/60 bg-muted/35 p-5">
          <ShieldCheck class="size-5 text-primary" />
          <p class="mt-4 font-medium">登录后即可使用系统</p>
          <p class="mt-2 text-sm text-muted-foreground">登录后会自动进入系统。</p>
        </div>
      </div>

      <Card class="border-white/60 bg-white/80 shadow-[0_28px_80px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-white/8">
        <CardHeader>
          <CardTitle class="text-3xl">登录系统</CardTitle>
          <CardDescription>输入账号和密码即可登录。</CardDescription>
        </CardHeader>
        <CardContent class="space-y-5">
          <div class="space-y-2">
            <p class="text-sm font-medium">用户名</p>
            <Input v-model="form.username" class="h-12" placeholder="请输入用户名" @keyup.enter="submit" />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">密码</p>
            <Input v-model="form.password" type="password" class="h-12" placeholder="请输入密码" @keyup.enter="submit" />
          </div>
          <div v-if="captchaEnabled" class="grid grid-cols-[1fr_110px] gap-2 sm:grid-cols-[1fr_132px] sm:gap-3">
            <div class="space-y-2">
              <p class="text-sm font-medium">验证码</p>
              <Input v-model="form.code" class="h-12" placeholder="请输入验证码" @keyup.enter="submit" />
            </div>
            <button type="button" class="mt-7 flex h-12 items-center justify-center overflow-hidden rounded-(--button-radius) border border-border/60 bg-muted/30" @click="loadCaptcha">
              <img v-if="captchaUrl" :src="captchaUrl" alt="验证码图片" class="h-full w-full object-cover" />
              <span v-else class="text-xs text-muted-foreground">刷新验证码</span>
            </button>
          </div>
          <label class="flex items-center gap-3 rounded-(--button-radius) border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <Checkbox :model-value="form.remember" @update:model-value="value => form.remember = Boolean(value)" />
            记住登录状态
          </label>
          <div class="flex gap-3">
            <Button variant="outline" class="h-12 flex-1" @click="router.push('/register')">注册账号</Button>
            <Button class="h-12 flex-1" :disabled="submitting" @click="submit">{{ submitting ? '登录中...' : '进入系统' }}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>





