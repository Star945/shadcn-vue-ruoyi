<script setup lang="ts">
import { computed, ref, useSlots, watch } from 'vue'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'

import { cn } from '@/lib/utils'
import { collectTreeBranchIds, flattenVisibleTree } from '@/lib/tree'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

const props = withDefaults(defineProps<{
  nodes: Array<Record<string, any>>
  modelValue?: string | number | null
  selectedKeys?: Array<string | number>
  selectionMode?: 'single' | 'multiple' | 'none'
  defaultExpandAll?: boolean
  indentSize?: number
  emptyText?: string
  itemClass?: string
  activeClass?: string
  getId?: (node: Record<string, any>) => string | number
  getLabel?: (node: Record<string, any>) => string
  getChildren?: (node: Record<string, any>) => Array<Record<string, any>> | undefined
}>(), {
  modelValue: '',
  selectedKeys: () => [],
  selectionMode: 'single',
  defaultExpandAll: false,
  indentSize: 18,
  emptyText: '暂无数据',
  itemClass: '',
  activeClass: 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
  getId: (node: Record<string, any>) => node.id ?? node.menuId ?? node.deptId,
  getLabel: (node: Record<string, any>) => String(node.label ?? node.menuName ?? node.deptName ?? node.name ?? '--'),
  getChildren: (node: Record<string, any>) => node.children,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:selectedKeys', value: string[]): void
}>()

const slots = useSlots()
const initialized = ref(false)
const expandedKeys = ref<string[]>([])

const resolver = computed(() => ({
  getId: props.getId,
  getLabel: props.getLabel,
  getChildren: props.getChildren,
}))

const branchIds = computed(() => collectTreeBranchIds(props.nodes, resolver.value))
const expandedKeySet = computed(() => new Set(expandedKeys.value))
const visibleNodes = computed(() => flattenVisibleTree(props.nodes, resolver.value, expandedKeys.value))
const allExpanded = computed(() => branchIds.value.length > 0 && branchIds.value.every(id => expandedKeySet.value.has(id)))
const selectedKeySet = computed(() => new Set((props.selectedKeys ?? []).map(item => String(item))))
const hasToolbar = computed(() => branchIds.value.length > 0 || Boolean(slots.toolbarLeading) || Boolean(slots.toolbarTrailing))

function syncExpandedKeys() {
  const nextBranchIds = branchIds.value
  if (!initialized.value) {
    expandedKeys.value = props.defaultExpandAll ? [...nextBranchIds] : []
    initialized.value = true
    return
  }

  const branchSet = new Set(nextBranchIds)
  expandedKeys.value = expandedKeys.value.filter(id => branchSet.has(id))
}

function toggleExpand(id: string) {
  expandedKeys.value = expandedKeySet.value.has(id)
    ? expandedKeys.value.filter(item => item !== id)
    : [...expandedKeys.value, id]
}

function toggleExpandAll() {
  expandedKeys.value = allExpanded.value ? [] : [...branchIds.value]
}

function updateSingleSelection(id: string) {
  emit('update:modelValue', id)
}

function updateMultipleSelection(id: string, checked: boolean) {
  const next = checked
    ? [...new Set([...selectedKeySet.value, id])]
    : [...selectedKeySet.value].filter(item => item !== id)
  emit('update:selectedKeys', next)
}

watch(() => props.nodes, syncExpandedKeys, { immediate: true, deep: true })
</script>

<template>
  <div class="space-y-3">
    <div v-if="hasToolbar" class="flex items-center gap-2">
      <div class="min-w-0 flex flex-1 items-center gap-2">
        <slot name="toolbarLeading" />
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <slot name="toolbarTrailing" />
        <Button v-if="branchIds.length" size="sm" variant="ghost" class="h-8 px-2 text-xs" @click="toggleExpandAll">
          {{ allExpanded ? '收起全部' : '展开全部' }}
        </Button>
      </div>
    </div>

    <div v-if="visibleNodes.length" class="space-y-1">
      <div
        v-for="item in visibleNodes"
        :key="item.id"
        class="flex items-center gap-2"
        :style="{ paddingInlineStart: `${item.depth * indentSize}px` }"
      >
        <button
          v-if="item.hasChildren"
          type="button"
          class="inline-flex size-7 shrink-0 items-center justify-center rounded-[var(--button-radius)] text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
          @click="toggleExpand(item.id)"
        >
          <ChevronDown v-if="item.expanded" class="size-4" />
          <ChevronRight v-else class="size-4" />
        </button>
        <span v-else class="inline-flex size-7 shrink-0" />

        <button
          v-if="selectionMode === 'single'"
          type="button"
          class="flex min-h-9 min-w-0 flex-1 items-center rounded-[var(--button-radius)] px-3 text-left text-sm transition"
          :class="cn(String(modelValue) === item.id ? activeClass : 'hover:bg-muted/60', itemClass)"
          @click="updateSingleSelection(item.id)"
        >
          <span class="truncate">{{ item.label }}</span>
        </button>

        <label
          v-else-if="selectionMode === 'multiple'"
          class="flex min-h-9 min-w-0 flex-1 items-center gap-3 rounded-[var(--button-radius)] px-3 text-sm transition hover:bg-muted/40"
          :class="itemClass"
        >
          <Checkbox
            :checked="selectedKeySet.has(item.id)"
            @update:checked="(checked: boolean | 'indeterminate') => updateMultipleSelection(item.id, Boolean(checked))"
          />
          <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
        </label>

        <div v-else class="flex min-h-9 min-w-0 flex-1 items-center rounded-[var(--button-radius)] px-3 text-sm" :class="itemClass">
          <span class="truncate">{{ item.label }}</span>
        </div>
      </div>
    </div>

    <p v-else class="text-sm text-muted-foreground">{{ emptyText }}</p>
  </div>
</template>
