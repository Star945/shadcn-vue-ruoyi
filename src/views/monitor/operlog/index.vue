<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Eye, Trash2 } from 'lucide-vue-next'

import type { AdminTableActionItem, AdminTableColumn } from '@/components/admin/data-table'

import { cleanOperlog, delOperlog, exportOperlog, list } from '@/api/monitor/operlog'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminDateRangePicker from '@/components/admin/AdminDateRangePicker.vue'
import AdminFormField from '@/components/admin/AdminFormField.vue'
import AdminQueryPanel from '@/components/admin/AdminQueryPanel.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge.vue'

import AdminDialogContent from '@/components/admin/AdminDialogContent.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAccess } from '@/lib/access'
import { saveBlob } from '@/lib/download'
import { monitorOperStatusLabel, monitorOperTypeLabel, monitorOperTypeOptions, prettyJson } from '@/lib/monitor'
import { permissionKeys } from '@/lib/permission-keys'
import { buildDateRangeParams } from '@/lib/tree'

const access = useAccess()
const operlogPerms = permissionKeys.monitor.operlog

const operlogTableColumns: AdminTableColumn[] = [
  { key: 'operId', title: '日志编号' },
  { key: 'title', title: '系统模块' },
  { key: 'businessType', title: '业务类型', headerClass: 'text-center', cellClass: 'text-center' },
  { key: 'operName', title: '操作人员' },
  { key: 'operIp', title: '操作地址' },
  { key: 'status', title: '状态', headerClass: 'text-center', cellClass: 'text-center' },
  { key: 'operTime', title: '操作时间' },
  { key: 'costTime', title: '耗时', headerClass: 'text-right', cellClass: 'text-right' },
]

const operStatusOptions = [
  { label: '全部', value: 'all' },
  { label: '正常', value: '0' },
  { label: '异常', value: '1' },
] as const

const loading = ref(false)
const rows = ref<any[]>([])
const total = ref(0)
const selectedRows = ref<any[]>([])
const selectedRowKeys = ref<Array<string | number>>([])
const detailOpen = ref(false)
const detailRow = ref<Record<string, any>>({})

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  operIp: '',
  title: '',
  operName: '',
  businessType: 'all',
  status: 'all',
  beginDate: '',
  endDate: '',
})

const canQueryOperlog = computed(() => access.can(operlogPerms.query))
const canRemoveOperlog = computed(() => access.can(operlogPerms.remove))
const canExportOperlog = computed(() => access.can(operlogPerms.export))
const operlogRowActions: AdminTableActionItem[] = [
  { label: '详情', icon: Eye, visible: () => canQueryOperlog.value, onClick: (row) => openDetail(row) },
  { label: '删除', icon: Trash2, tone: 'danger', visible: () => canRemoveOperlog.value, onClick: (row) => handleDelete(row) },
]

function resetSelection() {
  selectedRows.value = []
  selectedRowKeys.value = []
}

function buildQueryPayload() {
  return {
    operIp: queryParams.operIp || undefined,
    title: queryParams.title || undefined,
    operName: queryParams.operName || undefined,
    businessType: queryParams.businessType === 'all' ? undefined : queryParams.businessType,
    status: queryParams.status === 'all' ? undefined : queryParams.status,
    ...buildDateRangeParams(queryParams.beginDate || undefined, queryParams.endDate || undefined),
  }
}

async function loadList() {
  loading.value = true
  resetSelection()
  try {
    const response = await list({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      ...buildQueryPayload(),
    })
    rows.value = Array.isArray(response.rows) ? response.rows : []
    total.value = Number(response.total ?? 0)
  }
  catch (error) {
    toast.error('操作日志加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    loading.value = false
  }
}

async function handleQuery() {
  queryParams.pageNum = 1
  await loadList()
}

async function handleResetQuery() {
  queryParams.pageNum = 1
  queryParams.pageSize = 10
  queryParams.operIp = ''
  queryParams.title = ''
  queryParams.operName = ''
  queryParams.businessType = 'all'
  queryParams.status = 'all'
  queryParams.beginDate = ''
  queryParams.endDate = ''
  await loadList()
}

function handleSelectionChange(rowsOnPage: Array<Record<string, any>>, keys: Array<string | number>) {
  selectedRows.value = rowsOnPage
  selectedRowKeys.value = keys
}

async function handleExport() {
  if (!access.require(operlogPerms.export, '导出操作日志')) {
    return
  }

  try {
    const blob = await exportOperlog(buildQueryPayload())
    saveBlob(blob, 'operlog.xlsx')
    toast.success('操作日志导出成功')
  }
  catch (error) {
    toast.error('操作日志导出失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

function openDetail(row: Record<string, any>) {
  if (!access.require(operlogPerms.query, '查看操作日志详情')) {
    return
  }
  detailRow.value = row
  detailOpen.value = true
}

async function handleDelete(row?: Record<string, any>) {
  if (!access.require(operlogPerms.remove, '删除操作日志')) {
    return
  }

  const ids = row?.operId ? [row.operId] : selectedRows.value.map(item => item.operId)
  if (!ids.length) {
    toast.warning('请先选择需要删除的日志')
    return
  }

  try {
    await delOperlog(ids.join(','))
    toast.success('操作日志删除成功')
    await loadList()
  }
  catch (error) {
    toast.error('操作日志删除失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function handleClean() {
  if (!access.require(operlogPerms.remove, '清空操作日志')) {
    return
  }

  try {
    await cleanOperlog()
    toast.success('操作日志清空成功')
    await loadList()
  }
  catch (error) {
    toast.error('操作日志清空失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function changePage(step: number) {
  const nextPage = queryParams.pageNum + step
  if (nextPage < 1) {
    return
  }
  queryParams.pageNum = nextPage
  await loadList()
}

async function changePageSize(value: number) {
  queryParams.pageNum = 1
  queryParams.pageSize = value
  await loadList()
}

onMounted(loadList)
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="admin-kicker">系统监控 / 操作日志</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight">操作日志</h1>
    </div>

    <AdminSectionCard title="操作日志列表" content-class="space-y-4">
      <template #headerExtra>
        <Badge variant="outline">已选 {{ selectedRows.length }} 项</Badge>
        <Button v-if="canExportOperlog" variant="outline" size="sm" @click="handleExport">导出日志</Button>
        <Button v-if="canRemoveOperlog" variant="outline" size="sm" :disabled="selectedRows.length === 0" @click="handleDelete()">删除所选</Button>
        <Button v-if="canRemoveOperlog" variant="outline" size="sm" @click="handleClean">清空日志</Button>
        <Button variant="outline" size="sm" @click="loadList">刷新</Button>
      </template>
      <AdminQueryPanel embedded grid-class="sm:grid-cols-2 xl:grid-cols-3" advanced-grid-class="sm:grid-cols-2 xl:grid-cols-3" @query="handleQuery" @reset="handleResetQuery">
        <AdminFormField label="操作地址">
          <Input v-model="queryParams.operIp" placeholder="请输入操作地址" />
        </AdminFormField>
        <AdminFormField label="系统模块">
          <Input v-model="queryParams.title" placeholder="请输入系统模块" />
        </AdminFormField>
        <AdminFormField label="操作人员">
          <Input v-model="queryParams.operName" placeholder="请输入操作人员" />
        </AdminFormField>
        <template #advanced>
          <AdminFormField label="业务类型">
            <Select v-model="queryParams.businessType">
              <SelectTrigger><SelectValue placeholder="请选择业务类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in monitorOperTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField label="状态">
            <Select v-model="queryParams.status">
              <SelectTrigger><SelectValue placeholder="请选择状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in operStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField label="日期范围" field-class="md:col-span-2">
            <AdminDateRangePicker v-model:start="queryParams.beginDate" v-model:end="queryParams.endDate" />
          </AdminFormField>
        </template>
      </AdminQueryPanel>
      <AdminDataTable
        :columns="operlogTableColumns"
        :rows="rows"
        row-key="operId"
        :loading="loading"
        loading-text="正在加载操作日志..."
        empty-text="暂无操作日志"
        show-selection
        :selected-row-keys="selectedRowKeys"
        :actions="operlogRowActions"
        action-header-class="w-[120px] text-right"
        :show-pagination="true"
        :total="total"
        :page-num="queryParams.pageNum"
        :page-size="queryParams.pageSize"
        @update:selected-row-keys="selectedRowKeys = $event"
        @selection-change="handleSelectionChange"
        @update:page-size="changePageSize"
        @update:page-num="changePage($event - queryParams.pageNum)"
        @previous="changePage(-1)"
        @next="changePage(1)"
      >
        <template #cell-title="{ value }">
          <span class="font-medium">{{ value }}</span>
        </template>
        <template #cell-businessType="{ row }">
          <Badge variant="outline">{{ monitorOperTypeLabel(row.businessType) }}</Badge>
        </template>
        <template #cell-status="{ row }">
          <AdminStatusBadge :label="monitorOperStatusLabel(row.status)" />
        </template>
        <template #cell-costTime="{ value }">
          <span>{{ value ? `${value} ms` : '--' }}</span>
        </template>
      </AdminDataTable>
    </AdminSectionCard>

    <Dialog v-model:open="detailOpen">
      <AdminDialogContent size="3xl">
        <DialogHeader>
          <DialogTitle>操作日志详情</DialogTitle>
          <DialogDescription>查看操作详情。</DialogDescription>
        </DialogHeader>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p class="text-sm font-medium">系统模块</p>
            <p class="mt-2 text-sm text-muted-foreground">{{ detailRow.title || '--' }}</p>
          </div>
          <div class="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p class="text-sm font-medium">业务类型</p>
            <p class="mt-2 text-sm text-muted-foreground">{{ monitorOperTypeLabel(detailRow.businessType) }}</p>
          </div>
          <div class="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p class="text-sm font-medium">操作人员</p>
            <p class="mt-2 text-sm text-muted-foreground">{{ detailRow.operName || '--' }}</p>
          </div>
          <div class="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p class="text-sm font-medium">所属部门</p>
            <p class="mt-2 text-sm text-muted-foreground">{{ detailRow.deptName || '--' }}</p>
          </div>
          <div class="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p class="text-sm font-medium">操作地址</p>
            <p class="mt-2 text-sm text-muted-foreground">{{ detailRow.operIp || '--' }} {{ detailRow.operLocation || '' }}</p>
          </div>
          <div class="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p class="text-sm font-medium">状态</p>
            <p class="mt-2 text-sm text-muted-foreground">{{ monitorOperStatusLabel(detailRow.status) }}</p>
          </div>
          <div class="rounded-2xl border border-border/60 bg-muted/20 p-4 md:col-span-2">
            <p class="text-sm font-medium">请求地址</p>
            <p class="mt-2 break-all text-sm text-muted-foreground">{{ detailRow.requestMethod || '--' }} {{ detailRow.operUrl || '--' }}</p>
          </div>
          <div class="rounded-2xl border border-border/60 bg-muted/20 p-4 md:col-span-2">
            <p class="text-sm font-medium">调用方法</p>
            <p class="mt-2 break-all font-mono text-xs text-muted-foreground">{{ detailRow.method || '--' }}</p>
          </div>
          <div class="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p class="text-sm font-medium">操作时间</p>
            <p class="mt-2 text-sm text-muted-foreground">{{ detailRow.operTime || '--' }}</p>
          </div>
          <div class="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p class="text-sm font-medium">耗时</p>
            <p class="mt-2 text-sm text-muted-foreground">{{ detailRow.costTime ? `${detailRow.costTime} ms` : '--' }}</p>
          </div>
          <div class="rounded-2xl border border-border/60 bg-muted/20 p-4 md:col-span-2">
            <p class="text-sm font-medium">请求参数</p>
            <pre class="mt-3 overflow-x-auto surface-scrollbar rounded-2xl bg-background p-4 font-mono text-xs text-muted-foreground">{{ prettyJson(detailRow.operParam) }}</pre>
          </div>
          <div class="rounded-2xl border border-border/60 bg-muted/20 p-4 md:col-span-2">
            <p class="text-sm font-medium">结果</p>
            <pre class="mt-3 overflow-x-auto surface-scrollbar rounded-2xl bg-background p-4 font-mono text-xs text-muted-foreground">{{ prettyJson(detailRow.jsonResult) }}</pre>
          </div>
          <div v-if="String(detailRow.status) === '1' && detailRow.errorMsg" class="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 md:col-span-2">
            <p class="text-sm font-medium text-destructive">异常信息</p>
            <pre class="mt-3 overflow-x-auto surface-scrollbar whitespace-pre-wrap rounded-2xl bg-background p-4 font-mono text-xs text-muted-foreground">{{ prettyJson(detailRow.errorMsg) }}</pre>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="detailOpen = false">关闭</Button>
        </DialogFooter>
      </AdminDialogContent>
    </Dialog>
  </div>
</template>











