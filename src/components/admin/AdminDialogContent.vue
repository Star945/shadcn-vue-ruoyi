<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { X } from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  useForwardPropsEmits,
} from 'reka-ui'

import { cn } from '@/lib/utils'

type AdminDialogSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full'
type AdminDialogScroll = 'viewport' | 'content'

const props = withDefaults(defineProps<DialogContentProps & {
  class?: HTMLAttributes['class']
  showCloseButton?: boolean
  size?: AdminDialogSize
  scroll?: AdminDialogScroll
  centered?: boolean
}>(), {
  showCloseButton: true,
  size: 'lg',
  scroll: 'viewport',
  centered: false,
})

const emits = defineEmits<DialogContentEmits>()

defineOptions({
  inheritAttrs: false,
})

const delegatedProps = reactiveOmit(props, 'class', 'showCloseButton', 'size', 'scroll', 'centered')
const forwarded = useForwardPropsEmits(delegatedProps, emits)

const sizeClasses: Record<AdminDialogSize, string> = {
  xs: 'sm:max-w-[420px]',
  sm: 'sm:max-w-[560px]',
  md: 'sm:max-w-[680px]',
  lg: 'sm:max-w-[760px]',
  xl: 'sm:max-w-[860px]',
  '2xl': 'sm:max-w-[920px]',
  '3xl': 'sm:max-w-[960px]',
  '4xl': 'sm:max-w-[1080px]',
  '5xl': 'sm:max-w-[1180px]',
  full: 'sm:max-w-[min(1440px,calc(100vw-3rem))]',
}

// 默认走 viewport 滚动，让超高弹窗的滚动责任落在 overlay 上，比内部套多层 fixed 容器更稳定，也更接近 Element Plus Dialog 的体验。
const overlayClass = computed(() => cn(
  'fixed inset-0 z-50 overflow-y-auto bg-black/80 px-2 py-4 surface-scrollbar',
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  'sm:px-4 sm:py-8',
  props.scroll === 'content' && 'overflow-hidden',
))

const layoutClass = computed(() => cn(
  'flex min-h-full w-full justify-center',
  props.centered ? 'items-center' : 'items-start',
))

const contentClass = computed(() => cn(
  'bg-background relative z-50 grid w-full max-w-[calc(100%-0.5rem)] gap-3 border p-4 shadow-lg duration-150',
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  'transform-gpu will-change-transform will-change-opacity sm:gap-4 sm:p-6',
  'rounded-[var(--radius-xl)]',
  sizeClasses[props.size],
  props.scroll === 'viewport'
    ? 'overflow-visible'
    : 'max-h-[min(92svh,calc(100vh-1rem))] overflow-y-auto surface-scrollbar',
  props.class,
))

// 点击滚动条本身时不要误触发关闭，否则长弹窗在 Windows 下会有较差的体验。
function handlePointerDownOutside(event: CustomEvent<{ originalEvent: MouseEvent }>) {
  const originalEvent = event.detail?.originalEvent
  const target = originalEvent?.target
  if (!(target instanceof HTMLElement)) {
    return
  }

  if (originalEvent.offsetX > target.clientWidth || originalEvent.offsetY > target.clientHeight) {
    event.preventDefault()
  }
}
</script>

<template>
  <DialogPortal>
    <DialogOverlay :class="overlayClass">
      <div :class="layoutClass">
        <DialogContent
          data-slot="admin-dialog-content"
          v-bind="{ ...$attrs, ...forwarded }"
          :class="contentClass"
          @pointer-down-outside="handlePointerDownOutside"
        >
          <slot />

          <DialogClose
            v-if="showCloseButton"
            data-slot="dialog-close"
            class="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-3 right-3 opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none sm:top-4 sm:right-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            :class="'rounded-[var(--radius-sm)]'"
          >
            <X />
            <span class="sr-only">关闭</span>
          </DialogClose>
        </DialogContent>
      </div>
    </DialogOverlay>
  </DialogPortal>
</template>