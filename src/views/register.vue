<script setup lang="ts">
import { ShieldCheck, UserPlus } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { getCodeImg, register as registerApi } from '@/api/login'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { RequestError } from '@/utils/request'

const router = useRouter()
const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  code: '',
  uuid: '',
})

const submitting = ref(false)
const captchaEnabled = ref(true)
const captchaUrl = ref('')

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

  if (!form.confirmPassword.trim()) {
    toast.error('请再次输入确认密码')
    return
  }

  if (form.password !== form.confirmPassword) {
    toast.error('两次输入的密码不一致')
    return
  }

  if (captchaEnabled.value && !form.code.trim()) {
    toast.error('请输入验证码')
    return
  }

  submitting.value = true
  try {
    await registerApi({
      username: form.username.trim(),
      password: form.password,
      code: captchaEnabled.value ? form.code.trim() : undefined,
      uuid: captchaEnabled.value ? form.uuid : undefined,
    })
    toast.success('注册成功', { description: '现在可以返回登录页。' })
    router.push('/login')
  }
  catch (error) {
    const message = error instanceof RequestError ? error.message : '注册失败'
    toast.error('注册失败', { description: message })
    await loadCaptcha()
  }
  finally {
    submitting.value = false
  }
}

onMounted(loadCaptcha)
</script>

<template>
  <div class="min-h-svh bg-[radial-gradient(circle_at_top_right,var(--surface-glow-primary),transparent_28%),radial-gradient(circle_at_bottom_left,var(--surface-glow-secondary),transparent_22%),linear-gradient(180deg,#f8f4ec,#eef4f6)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top_right,var(--surface-glow-primary),transparent_24%),radial-gradient(circle_at_bottom_left,var(--surface-glow-secondary),transparent_20%),linear-gradient(180deg,#08111c,#0a1626)]">
    <div class="mx-auto grid max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div class="hidden rounded-[32px] border border-white/60 bg-white/70 p-8 shadow-[0_40px_100px_rgba(15,23,42,0.12)] backdrop-blur lg:block dark:border-white/10 dark:bg-white/6">
        <div class="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <UserPlus class="size-4 text-primary" />
          账号注册
        </div>
        <h1 class="mt-6 text-5xl font-semibold leading-tight tracking-tight">创建账号</h1>
        <p class="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
          提交后即可完成注册。
        </p>
        <div class="mt-8 rounded-3xl border border-border/60 bg-muted/35 p-5">
          <ShieldCheck class="size-5 text-primary" />
          <p class="mt-4 font-medium">注册完成即可登录</p>
          <p class="mt-2 text-sm text-muted-foreground">提交成功后可返回登录页。</p>
        </div>
      </div>

      <Card class="border-white/60 bg-white/80 shadow-[0_28px_80px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-white/8">
        <CardHeader>
          <CardTitle class="text-3xl">注册账号</CardTitle>
          <CardDescription>填写用户名、密码和验证码，完成注册。</CardDescription>
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
          <div class="space-y-2">
            <p class="text-sm font-medium">确认密码</p>
            <Input v-model="form.confirmPassword" type="password" class="h-12" placeholder="请再次输入密码" @keyup.enter="submit" />
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
          <div class="flex gap-3">
            <Button variant="outline" class="h-12 flex-1" @click="router.push('/login')">返回登录</Button>
            <Button class="h-12 flex-1" :disabled="submitting" @click="submit">{{ submitting ? '提交中...' : '提交注册' }}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>






