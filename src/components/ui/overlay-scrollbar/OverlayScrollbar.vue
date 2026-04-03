<script setup lang="ts">
import type { CSSProperties, HTMLAttributes } from 'vue'
import { useEventListener, useResizeObserver } from '@vueuse/core'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { cn } from '@/lib/utils'

type ScrollOrientation = 'vertical' | 'horizontal' | 'both'
type DragAxis = 'horizontal' | 'vertical' | null

const GAP = 4

const props = withDefaults(defineProps<{
  class?: HTMLAttributes['class']
  viewportClass?: HTMLAttributes['class']
  viewClass?: HTMLAttributes['class']
  orientation?: ScrollOrientation
  always?: boolean
  minThumbSize?: number
  hideDelay?: number
  wheelToHorizontal?: boolean
  tag?: string
}>(), {
  orientation: 'vertical',
  minThumbSize: 20,
  hideDelay: 900,
  tag: 'div',
})

const emit = defineEmits<{
  scroll: [{ scrollTop: number, scrollLeft: number }]
}>()

const wrapRef = ref<HTMLElement | null>(null)
const viewRef = ref<HTMLElement | null>(null)
const hovering = ref(false)
const active = ref(false)
const dragAxis = ref<DragAxis>(null)

const horizontalEnabled = ref(false)
const horizontalSize = ref(0)
const horizontalOffset = ref(0)
const horizontalRange = ref(0)

const verticalEnabled = ref(false)
const verticalSize = ref(0)
const verticalOffset = ref(0)
const verticalRange = ref(0)

const dragState = {
  startClient: 0,
  startScroll: 0,
}

let hideTimer: ReturnType<typeof setTimeout> | null = null

const showHorizontalBar = computed(() => horizontalEnabled.value && (props.always || active.value || hovering.value || dragAxis.value === 'horizontal'))
const showVerticalBar = computed(() => verticalEnabled.value && (props.always || active.value || hovering.value || dragAxis.value === 'vertical'))

const horizontalThumbStyle = computed<CSSProperties>(() => ({
  width: `${horizontalSize.value}px`,
  transform: `translate3d(${horizontalOffset.value}px, 0, 0)`,
}))

const verticalThumbStyle = computed<CSSProperties>(() => ({
  height: `${verticalSize.value}px`,
  transform: `translate3d(0, ${verticalOffset.value}px, 0)`,
}))

function isAxisEnabled(axis: 'horizontal' | 'vertical') {
  return props.orientation === 'both' || props.orientation === axis
}

function clearHideTimer() {
  if (!hideTimer) {
    return
  }
  clearTimeout(hideTimer)
  hideTimer = null
}

function scheduleHide() {
  if (props.always) {
    return
  }
  clearHideTimer()
  hideTimer = setTimeout(() => {
    if (!hovering.value && !dragAxis.value) {
      active.value = false
    }
  }, props.hideDelay)
}

function revealBars() {
  if (!props.always) {
    active.value = true
    scheduleHide()
  }
}

function updateAxis(axis: 'horizontal' | 'vertical') {
  const wrap = wrapRef.value
  if (!wrap || !isAxisEnabled(axis)) {
    if (axis === 'horizontal') {
      horizontalEnabled.value = false
      horizontalSize.value = 0
      horizontalOffset.value = 0
      horizontalRange.value = 0
    }
    else {
      verticalEnabled.value = false
      verticalSize.value = 0
      verticalOffset.value = 0
      verticalRange.value = 0
    }
    return
  }

  const clientSize = axis === 'horizontal' ? wrap.clientWidth : wrap.clientHeight
  const scrollSize = axis === 'horizontal' ? wrap.scrollWidth : wrap.scrollHeight
  const scrollOffset = axis === 'horizontal' ? wrap.scrollLeft : wrap.scrollTop

  if (!clientSize || scrollSize <= clientSize + 1) {
    if (axis === 'horizontal') {
      horizontalEnabled.value = false
      horizontalSize.value = 0
      horizontalOffset.value = 0
      horizontalRange.value = 0
    }
    else {
      verticalEnabled.value = false
      verticalSize.value = 0
      verticalOffset.value = 0
      verticalRange.value = 0
    }
    return
  }

  const trackSize = Math.max(clientSize - GAP, 0)
  const thumbSize = Math.max(Math.floor((trackSize * clientSize) / scrollSize), props.minThumbSize)
  const maxOffset = Math.max(trackSize - thumbSize, 0)
  const maxScroll = Math.max(scrollSize - clientSize, 0)
  const thumbOffset = maxScroll > 0 ? (scrollOffset / maxScroll) * maxOffset : 0

  if (axis === 'horizontal') {
    horizontalEnabled.value = true
    horizontalSize.value = thumbSize
    horizontalOffset.value = thumbOffset
    horizontalRange.value = maxOffset
  }
  else {
    verticalEnabled.value = true
    verticalSize.value = thumbSize
    verticalOffset.value = thumbOffset
    verticalRange.value = maxOffset
  }
}

function update() {
  updateAxis('horizontal')
  updateAxis('vertical')
}

function handleScroll() {
  const wrap = wrapRef.value
  if (!wrap) {
    return
  }
  update()
  revealBars()
  emit('scroll', { scrollTop: wrap.scrollTop, scrollLeft: wrap.scrollLeft })
}

function handleWheel(event: WheelEvent) {
  if (!props.wheelToHorizontal || !wrapRef.value || !horizontalEnabled.value) {
    return
  }

  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
    return
  }

  wrapRef.value.scrollLeft += event.deltaY
  event.preventDefault()
}

function handlePointerEnter() {
  hovering.value = true
  if (!props.always) {
    active.value = true
  }
}

function handlePointerLeave() {
  hovering.value = false
  scheduleHide()
}

function stopDrag() {
  dragAxis.value = null
  scheduleHide()
}

function handlePointerMove(event: PointerEvent) {
  const wrap = wrapRef.value
  const axis = dragAxis.value
  if (!wrap || !axis) {
    return
  }

  const isHorizontal = axis === 'horizontal'
  const clientSize = isHorizontal ? wrap.clientWidth : wrap.clientHeight
  const scrollSize = isHorizontal ? wrap.scrollWidth : wrap.scrollHeight
  const trackRange = isHorizontal ? horizontalRange.value : verticalRange.value
  const maxScroll = Math.max(scrollSize - clientSize, 0)

  if (!trackRange || !maxScroll) {
    return
  }

  const currentClient = isHorizontal ? event.clientX : event.clientY
  const deltaClient = currentClient - dragState.startClient
  const deltaScroll = (deltaClient * maxScroll) / trackRange

  if (isHorizontal) {
    wrap.scrollLeft = dragState.startScroll + deltaScroll
  }
  else {
    wrap.scrollTop = dragState.startScroll + deltaScroll
  }
}

function startDrag(axis: 'horizontal' | 'vertical', event: PointerEvent) {
  const wrap = wrapRef.value
  if (!wrap) {
    return
  }

  dragAxis.value = axis
  dragState.startClient = axis === 'horizontal' ? event.clientX : event.clientY
  dragState.startScroll = axis === 'horizontal' ? wrap.scrollLeft : wrap.scrollTop
  clearHideTimer()
  if (!props.always) {
    active.value = true
  }
}

function scrollTo(options: ScrollToOptions) {
  wrapRef.value?.scrollTo(options)
}

useResizeObserver(wrapRef, update)
useResizeObserver(viewRef, update)
useEventListener(window, 'resize', update)
useEventListener(window, 'pointermove', handlePointerMove)
useEventListener(window, 'pointerup', stopDrag)

onMounted(update)
onBeforeUnmount(clearHideTimer)

defineExpose({
  wrapRef,
  viewRef,
  update,
  scrollTo,
})
</script>

<template>
  <div
    data-slot="overlay-scrollbar"
    :class="cn('group/overlay-scrollbar relative overflow-hidden', props.class)"
    @pointerenter="handlePointerEnter"
    @pointerleave="handlePointerLeave"
  >
    <div
      ref="wrapRef"
      data-slot="overlay-scrollbar-wrap"
      :class="cn('size-full overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden', props.viewportClass)"
      @scroll="handleScroll"
      @wheel="handleWheel"
    >
      <component
        :is="tag"
        ref="viewRef"
        data-slot="overlay-scrollbar-view"
        :class="cn('min-h-full min-w-full', props.viewClass)"
      >
        <slot />
      </component>
    </div>

    <div
      v-if="horizontalEnabled"
      class="pointer-events-none absolute inset-x-2 bottom-1 z-10 h-2.5 transition-opacity duration-200"
      :class="showHorizontalBar ? 'opacity-100' : 'opacity-0'"
    >
      <div
        class="pointer-events-auto absolute top-0 left-0 h-2.5 rounded-full bg-border/65 shadow-[0_1px_6px_rgba(15,23,42,0.12)] transition-colors hover:bg-border/90"
        :style="horizontalThumbStyle"
        @pointerdown.prevent.stop="startDrag('horizontal', $event)"
      />
    </div>

    <div
      v-if="verticalEnabled"
      class="pointer-events-none absolute top-2 right-1 bottom-2 z-10 w-2.5 transition-opacity duration-200"
      :class="showVerticalBar ? 'opacity-100' : 'opacity-0'"
    >
      <div
        class="pointer-events-auto absolute top-0 left-0 w-2.5 rounded-full bg-border/65 shadow-[0_1px_6px_rgba(15,23,42,0.12)] transition-colors hover:bg-border/90"
        :style="verticalThumbStyle"
        @pointerdown.prevent.stop="startDrag('vertical', $event)"
      />
    </div>
  </div>
</template>
