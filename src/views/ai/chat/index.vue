<script setup lang="ts">
import { MessageSquareText, Sparkles, WandSparkles } from 'lucide-vue-next'

import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">智能助手</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight">AI对话</h1>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <AdminSectionCard title="对话面板" description="输入问题开始对话。">
        <template #headerExtra>
          <Badge variant="outline">智能问答</Badge>
        </template>

        <div class="space-y-4">
          <div class="rounded-3xl border border-border/60 bg-muted/15 px-5 py-4">
            <div class="flex items-start gap-3">
              <div class="mt-0.5 flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles class="size-4" />
              </div>
              <div class="space-y-1">
                <p class="text-sm font-medium">欢迎使用 AI 对话</p>
                <p class="text-sm text-muted-foreground">可用于整理日志、生成草稿和辅助处理日常问题。</p>
              </div>
            </div>
          </div>

          <Textarea class="min-h-40 sm:min-h-48" placeholder="请输入你的问题，例如：请帮我总结今天的异常日志。" />

          <div class="flex flex-wrap gap-2">
            <Button class="gap-2">
              <MessageSquareText class="size-4" />
              发送问题
            </Button>
            <Button variant="outline" class="gap-2">
              <WandSparkles class="size-4" />
              生成建议
            </Button>
          </div>
        </div>
      </AdminSectionCard>

      <div class="grid gap-6">
        <AdminSectionCard title="常用提示" description="快速开始。">
          <div class="grid gap-3">
            <button type="button" class="rounded-3xl border border-border/60 bg-muted/15 px-4 py-4 text-left text-sm transition hover:bg-muted/30">总结最近登录失败原因</button>
            <button type="button" class="rounded-3xl border border-border/60 bg-muted/15 px-4 py-4 text-left text-sm transition hover:bg-muted/30">整理本周操作日志异常项</button>
            <button type="button" class="rounded-3xl border border-border/60 bg-muted/15 px-4 py-4 text-left text-sm transition hover:bg-muted/30">生成一个新的页面草稿</button>
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="使用说明" description="从常用问题开始。">
          <div class="space-y-3 text-sm text-muted-foreground">
            <p>可用于整理公告、登录日志和操作记录。</p>
            <p>后续可按业务增加会话上下文、历史记录和快捷指令。</p>
          </div>
        </AdminSectionCard>
      </div>
    </div>
  </div>
</template>