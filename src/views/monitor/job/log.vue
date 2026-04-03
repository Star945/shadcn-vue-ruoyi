<script setup lang="ts">
import { Eye, Trash2 } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import type { AdminTableActionItem, AdminTableColumn } from '@/components/admin/data-table'

import { getJob } from '@/api/monitor/job'
import { cleanJobLog, delJobLog, exportJobLog, listJobLog } from '@/api/monitor/jobLog'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminFormField from '@/components/admin/AdminFormField.vue'
import AdminQueryPanel from '@/components/admin/AdminQueryPanel.vue'

import AdminDialogContent from '@/components/admin/AdminDialogContent.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAccess } from '@/lib/access'
import { saveBlob } from '@/lib/download'
import { permissionKeys } from '@/lib/permission-keys'
import { prettyJson } from '@/lib/monitor'

const route = useRoute()
const router = useRouter()
const access = useAccess()
const jobPerms = permissionKeys.monitor.job

const jobLogColumns: AdminTableColumn[] = [
  { key: 'jobLogId', title: '日志编号' },
  { key: 'jobName', title: '任务名称' },
  { key: 'jobGroup', title: '任务组名' },
  { key: 'invokeTarget', title: '调用目标' },
  { key: 'jobMessage', title: '日志信息' },
  { key: 'status', title: '结果', headerClass: 'text-center', cellClass: 'text-center' },
  { key: 'createTime', title: '执行时间' },
]

const loading = ref(false)
const rows = ref<any[]>([])
const total = ref(0)
const selectedRows = ref<any[]>([])
const selectedRowKeys = ref<Array<string | number>>([])
const currentJobName = ref('调度日志')
const currentJobGroup = ref('')
const detailOpen = ref(false)
const detailRow = ref<Record<string, any> | null>(null)

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  jobName: '',
  status: 'all',
})

const canQueryJobLog = computed(() => access.can(jobPerms.query))
const canRemoveJobLog = computed(() => access.can(jobPerms.remove))
const canExportJobLog = computed(() => access.can(jobPerms.export))
const jobLogRowActions: AdminTableActionItem[] = [
  { label: '详情', icon: Eye, visible: () => canQueryJobLog.value, onClick: (row) => openDetail(row) },
  { label: '删除', icon: Trash2, tone: 'danger', visible: () => canRemoveJobLog.value, onClick: (row) => removeRow(row) },
]
const detailText = computed(() => prettyJson(detailRow.value))

function statusText(value: string) {
  return value === '0' ? '成功' : '失败'
}

function resetSelection() {
  selectedRows.value = []
  selectedRowKeys.value = []
}

function buildQueryPayload() {
  return {
    jobName: queryParams.jobName || undefined,
    jobGroup: currentJobGroup.value || undefined,
    status: queryParams.status === 'all' ? undefined : queryParams.status,
  }
}

async function loadContext() {
  const jobId = String(route.params.jobId ?? '')
  if (!jobId || jobId === '0') {
    return
  }

  try {
    const response = await getJob(jobId)
    currentJobName.value = String(response.data?.jobName ?? '调度日志')
    currentJobGroup.value = String(response.data?.jobGroup ?? '')
    queryParams.jobName = currentJobName.value === '调度日志' ? '' : currentJobName.value
  }
  catch (error) {
    toast.error('任务上下文加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function loadList() {
  loading.value = true
  resetSelection()
  try {
    const response = await listJobLog({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      ...buildQueryPayload(),
    })
    rows.value = Array.isArray(response.rows) ? response.rows : []
    total.value = Number(response.total ?? 0)
  }
  catch (error) {
    toast.error('调度日志加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
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
  queryParams.jobName = currentJobName.value === '调度日志' ? '' : currentJobName.value
  queryParams.status = 'all'
  await loadList()
}

function handleSelectionChange(rowsOnPage: Array<Record<string, any>>, keys: Array<string | number>) {
  selectedRows.value = rowsOnPage
  selectedRowKeys.value = keys
}

async function handleExport() {
  if (!access.require(jobPerms.export, '导出调度日志')) {
    return
  }

  try {
    const blob = await exportJobLog(buildQueryPayload())
    saveBlob(blob, 'jobLog.xlsx')
    toast.success('调度日志导出成功')
  }
  catch (error) {
    toast.error('调度日志导出失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

function openDetail(row: Record<string, any>) {
  if (!access.require(jobPerms.query, '查看调度日志详情')) {
    return
  }
  detailRow.value = row
  detailOpen.value = true
}

async function removeRow(row?: Record<string, any>) {
  if (!access.require(jobPerms.remove, '删除调度日志')) {
    return
  }

  const ids = row?.jobLogId ? [row.jobLogId] : selectedRows.value.map(item => item.jobLogId)
  if (!ids.length) {
    toast.warning('请先选择需要删除的日志')
    return
  }

  try {
    await delJobLog(ids.join(','))
    toast.success('日志删除成功')
    await loadList()
  }
  catch (error) {
    toast.error('日志删除失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function clearLogs() {
  if (!access.require(jobPerms.remove, '清空调度日志')) {
    return
  }

  try {
    await cleanJobLog()
    toast.success('日志清空成功')
    await loadList()
  }
  catch (error) {
    toast.error('日志清空失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
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

onMounted(async () => {
  await loadContext()
  await loadList()
})
</script>

<template>
  <div class="space-y-6">
    <div>
        <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">系统监控 / 调度日志</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight">{{ currentJobName }}</h1>
      </div>

    <AdminQueryPanel grid-class="md:grid-cols-2 xl:grid-cols-3" @query="handleQuery" @reset="handleResetQuery">
      <AdminFormField label="任务名称">
        <Input v-model="queryParams.jobName" placeholder="请输入任务名称" />
      </AdminFormField>
      <AdminFormField label="执行结果">
        <Select v-model="queryParams.status">
          <SelectTrigger><SelectValue placeholder="请选择执行结果" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="0">成功</SelectItem>
            <SelectItem value="1">失败</SelectItem>
          </SelectContent>
        </Select>
      </AdminFormField>
    </AdminQueryPanel>

    <AdminSectionCard title="调度日志列表">
      <template #headerExtra>
        <Badge variant="outline">已选 {{ selectedRows.length }} 项</Badge>
        <Button variant="outline" size="sm" @click="router.push('/monitor/job')">返回任务</Button>
        <Button v-if="canExportJobLog" variant="outline" size="sm" @click="handleExport">导出日志</Button>
        <Button v-if="canRemoveJobLog" variant="outline" size="sm" :disabled="selectedRows.length === 0" @click="removeRow()">删除所选</Button>
        <Button v-if="canRemoveJobLog" variant="outline" size="sm" @click="clearLogs">清空日志</Button>
        <Button variant="outline" size="sm" @click="loadList">刷新</Button>
      </template>
      <AdminDataTable
        :columns="jobLogColumns"
        :rows="rows"
        row-key="jobLogId"
        :loading="loading"
        loading-text="正在加载调度日志..."
        empty-text="暂无数据"
        show-selection
        :selected-row-keys="selectedRowKeys"
        :actions="jobLogRowActions"
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
        <template #cell-jobName="{ value }">
          <span class="font-medium">{{ value }}</span>
        </template>
        <template #cell-status="{ row }">
          <Badge :variant="String(row.status ?? '0') === '0' ? 'outline' : 'destructive'">
            {{ statusText(String(row.status ?? '0')) }}
          </Badge>
        </template>
      </AdminDataTable>
    </AdminSectionCard>

    <Dialog v-model:open="detailOpen">
      <AdminDialogContent size="2xl">
        <DialogHeader>
          <DialogTitle>调度日志详情</DialogTitle>
          <DialogDescription>查看本次执行结果。</DialogDescription>
        </DialogHeader>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-3xl border border-border/70 bg-muted/20 p-4">
            <p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">基础信息</p>
            <div class="mt-3 space-y-3 text-sm">
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4"><span class="text-muted-foreground">日志编号</span><span class="text-left font-medium sm:text-right">{{ detailRow?.jobLogId ?? '--' }}</span></div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4"><span class="text-muted-foreground">任务名称</span><span class="text-left font-medium sm:text-right">{{ detailRow?.jobName ?? '--' }}</span></div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4"><span class="text-muted-foreground">任务组</span><span class="text-left font-medium sm:text-right">{{ detailRow?.jobGroup ?? '--' }}</span></div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4"><span class="text-muted-foreground">调用目标</span><span class="break-all text-left font-medium sm:text-right">{{ detailRow?.invokeTarget ?? '--' }}</span></div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4"><span class="text-muted-foreground">执行结果</span><span class="text-left font-medium sm:text-right">{{ statusText(String(detailRow?.status ?? '0')) }}</span></div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4"><span class="text-muted-foreground">执行时间</span><span class="text-left font-medium sm:text-right">{{ detailRow?.createTime ?? '--' }}</span></div>
            </div>
          </div>

          <div class="rounded-3xl border border-border/70 bg-muted/20 p-4">
            <p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">日志详情</p>
            <pre class="mt-3 min-h-[180px] overflow-x-auto surface-scrollbar whitespace-pre-wrap font-mono text-xs leading-6 text-foreground sm:min-h-[220px]">{{ detailText }}</pre>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="detailOpen = false">关闭</Button>
        </DialogFooter>
      </AdminDialogContent>
    </Dialog>
  </div>
</template>






