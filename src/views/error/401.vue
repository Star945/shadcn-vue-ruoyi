<script setup lang="ts">
import { ShieldAlert } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const router = useRouter()
</script>

<template>
  <div class="flex min-h-svh items-center justify-center px-4">
    <Card class="w-full max-w-lg border-white/60 bg-white/80 shadow-[0_28px_80px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/8">
      <CardHeader><div class="mb-4 flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500"><ShieldAlert class="size-7" /></div><CardTitle class="text-3xl">401</CardTitle><CardDescription>当前账号无权访问此页面。</CardDescription></CardHeader>
      <CardContent class="flex gap-3"><Button variant="outline" @click="router.back()">返回上一页</Button><Button @click="router.push('/index')">返回工作台</Button></CardContent>
    </Card>
  </div>
</template>

