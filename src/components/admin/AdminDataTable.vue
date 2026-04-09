<script setup lang="ts">
import { computed, useSlots } from 'vue'

import type { AdminTableActionItem, AdminTableColumn } from '@/components/admin/data-table'

import AdminTableActions from '@/components/admin/AdminTableActions.vue'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const props = withDefaults(defineProps<{
  columns: AdminTableColumn[]
  rows: Array<Record<string, any>>
  rowKey?: string | ((row: Record<string, any>, index: number) => string | number)
  loading?: boolean
  loadingText?: string
  emptyText?: string
  showSelection?: boolean
  selectedRowKeys?: Array<string | number>
  selectionHeaderClass?: string
  selectionCellClass?: string
  showActions?: boolean | 'auto'
  actions?: AdminTableActionItem[]
  actionHeader?: string
  actionHeaderClass?: string
  actionCellClass?: string
  actionCollapseAfter?: number
  actionInlineLimit?: number
  showPagination?: boolean
  total?: number
  pageNum?: number
  pageSize?: number
  pageSizeOptions?: number[]
  previousDisabled?: boolean
  nextDisabled?: boolean
}>(), {
  rowKey: 'id',
  loading: false,
  loadingText: '正在加载数据...',
  emptyText: '暂无数据',
  showSelection: false,
  selectedRowKeys: () => [],
  selectionHeaderClass: 'w-12',
  selectionCellClass: '',
  showActions: 'auto',
  actions: () => [],
  actionHeader: '操作',
  actionHeaderClass: 'w-[240px] text-right',
  actionCellClass: 'text-right',
  actionCollapseAfter: 3,
  actionInlineLimit: 2,
  showPagination: false,
  total: 0,
  pageNum: 1,
  pageSize: 10,
  pageSizeOptions: () => [10, 20, 50],
  previousDisabled: undefined,
  nextDisabled: undefined,
})

const emit = defineEmits<{
  (e: 'previous'): void
  (e: 'next'): void
  (e: 'update:pageNum', value: number): void
  (e: 'update:pageSize', value: number): void
  (e: 'update:selectedRowKeys', value: Array<string | number>): void
  (e: 'selectionChange', rows: Array<Record<string, any>>, keys: Array<string | number>): void
}>()

const slots = useSlots()

const withSelection = computed(() => props.showSelection || Boolean(slots.selection) || Boolean(slots['selection-header']))
// 操作列默认跟随 actions 配置自动出现，只有显式传 false 才强制隐藏.
const withActions = computed(() => {
  if (typeof props.showActions === 'boolean') {
    return props.showActions
  }
  return props.actions.length > 0 || Boolean(slots.actions)
})
const totalColumns = computed(() => props.columns.length + (withSelection.value ? 1 : 0) + (withActions.value ? 1 : 0))
const selectedKeySet = computed(() => new Set(props.selectedRowKeys))
const previousButtonDisabled = computed(() => props.previousDisabled ?? props.pageNum <= 1)
const nextButtonDisabled = computed(() => {
  if (typeof props.nextDisabled === 'boolean') {
    return props.nextDisabled
  }
  if (props.total > 0) {
    return props.pageNum * props.pageSize >= props.total
  }
  return props.rows.length < props.pageSize
})
const allVisibleSelected = computed(() => props.rows.length > 0 && props.rows.every((row, index) => selectedKeySet.value.has(resolveRowKey(row, index))))
const someVisibleSelected = computed(() => !allVisibleSelected.value && props.rows.some((row, index) => selectedKeySet.value.has(resolveRowKey(row, index))))
const paginationTotal = computed(() => Math.max(props.total, props.rows.length, 1))

function resolveRowKey(row: Record<string, any>, index: number) {
  if (typeof props.rowKey === 'function') {
    return props.rowKey(row, index)
  }
  if (props.rowKey && row[props.rowKey] !== undefined && row[props.rowKey] !== null) {
    return row[props.rowKey]
  }
  return row.id ?? index
}

function cellValue(row: Record<string, any>, key: string) {
  const directValue = row[key]
  if (directValue !== undefined) {
    return directValue === null || directValue === '' ? '--' : directValue
  }
  const rawValue = row.raw?.[key]
  return rawValue === undefined || rawValue === null || rawValue === '' ? '--' : rawValue
}

function updatePageSize(value: unknown) {
  const nextSize = Number(value ?? props.pageSize)
  emit('update:pageSize', Number.isFinite(nextSize) && nextSize > 0 ? nextSize : props.pageSize)
}

// 统一在这里同步 key 和 row，避免每个页面重复组装选中结果.
function syncSelection(nextKeys: Array<string | number>) {
  emit('update:selectedRowKeys', nextKeys)
  const selectedRows = props.rows.filter((row, index) => nextKeys.includes(resolveRowKey(row, index)))
  emit('selectionChange', selectedRows, nextKeys)
}

function toggleAllSelection(checked: boolean | 'indeterminate') {
  if (!Boolean(checked)) {
    const visibleKeys = props.rows.map((row, index) => resolveRowKey(row, index))
    syncSelection(props.selectedRowKeys.filter(key => !visibleKeys.includes(key)))
    return
  }

  const nextKeys = [...props.selectedRowKeys]
  props.rows.forEach((row, index) => {
    const key = resolveRowKey(row, index)
    if (!nextKeys.includes(key)) {
      nextKeys.push(key)
    }
  })
  syncSelection(nextKeys)
}

function toggleRowSelection(row: Record<string, any>, index: number, checked: boolean | 'indeterminate') {
  const key = resolveRowKey(row, index)
  if (Boolean(checked)) {
    if (!props.selectedRowKeys.includes(key)) {
      syncSelection([...props.selectedRowKeys, key])
    }
    return
  }
  syncSelection(props.selectedRowKeys.filter(selectedKey => selectedKey !== key))
}

function handlePageChange(nextPage: number) {
  if (nextPage === props.pageNum) {
    return
  }

  if (nextPage === props.pageNum - 1) {
    emit('previous')
    return
  }

  if (nextPage === props.pageNum + 1) {
    emit('next')
    return
  }

  emit('update:pageNum', nextPage)
}
</script>

<template>
  <div class="space-y-4">
    <div class="overflow-x-auto surface-scrollbar rounded-[var(--radius-lg)]">
      <Table class="min-w-full whitespace-nowrap text-sm">
        <TableHeader>
          <TableRow>
            <TableHead v-if="withSelection" :class="selectionHeaderClass">
              <slot name="selection-header">
                <Checkbox
                  :checked="allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false"
                  @update:checked="toggleAllSelection"
                />
              </slot>
            </TableHead>
            <TableHead v-for="column in columns" :key="column.key" :class="column.headerClass">{{ column.title }}</TableHead>
            <TableHead v-if="withActions" :class="actionHeaderClass">{{ actionHeader }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty v-if="loading" :colspan="totalColumns" class="text-muted-foreground">{{ loadingText }}</TableEmpty>
          <TableEmpty v-else-if="!rows.length" :colspan="totalColumns" class="text-muted-foreground">{{ emptyText }}</TableEmpty>
          <TableRow v-for="(row, index) in rows" v-else :key="resolveRowKey(row, index)">
            <TableCell v-if="withSelection" :class="selectionCellClass">
              <slot name="selection" :row="row" :index="index">
                <Checkbox
                  :checked="selectedKeySet.has(resolveRowKey(row, index))"
                  @update:checked="(checked: boolean | 'indeterminate') => toggleRowSelection(row, index, checked)"
                />
              </slot>
            </TableCell>
            <TableCell v-for="column in columns" :key="column.key" :class="column.cellClass">
              <slot :name="`cell-${column.key}`" :row="row" :index="index" :column="column" :value="cellValue(row, column.key)">
                {{ cellValue(row, column.key) }}
              </slot>
            </TableCell>
            <TableCell v-if="withActions" :class="cn('align-middle', actionCellClass)">
              <slot v-if="slots.actions" name="actions" :row="row" :index="index" />
              <AdminTableActions
                v-else-if="props.actions.length"
                :row="row"
                :index="index"
                :items="props.actions"
                :collapse-after="actionCollapseAfter"
                :inline-limit="actionInlineLimit"
              />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div v-if="showPagination" class="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border/60 bg-muted/15 px-3 py-3 sm:px-4 xl:flex-row xl:items-center xl:justify-between">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <span class="text-sm text-muted-foreground">共 {{ total }} 条</span>
        <Select :model-value="String(pageSize)" @update:model-value="updatePageSize">
          <SelectTrigger class="h-9 w-full sm:w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="option in pageSizeOptions" :key="option" :value="String(option)">{{ option }} / 页</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="overflow-x-auto surface-scrollbar pb-1">
        <Pagination
          :page="pageNum"
          :items-per-page="pageSize"
          :total="paginationTotal"
          :show-edges="paginationTotal > pageSize"
          :sibling-count="1"
          class="mx-0 justify-start xl:justify-end"
          @update:page="handlePageChange"
        >
          <PaginationContent v-slot="{ items }" class="w-max min-w-full flex-nowrap">
            <PaginationPrevious :disabled="previousButtonDisabled" />

            <template v-for="(item, index) in items" :key="`${item.type}-${item.type === 'page' ? item.value : index}`">
              <PaginationItem
                v-if="item.type === 'page'"
                :value="item.value"
                :is-active="item.value === pageNum"
              >
                {{ item.value }}
              </PaginationItem>
              <PaginationEllipsis v-else :index="index" />
            </template>

            <PaginationNext :disabled="nextButtonDisabled" />
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  </div>
</template>




