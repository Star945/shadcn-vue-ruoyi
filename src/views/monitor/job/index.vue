<script setup lang="ts">
import { FileText, Pencil, Play, Trash2 } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import type { AdminTableActionItem, AdminTableColumn } from '@/components/admin/data-table'

import { addJob, changeJobStatus, delJob, exportJob, getJob, listJob, runJob, updateJob } from '@/api/monitor/job'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminFormField from '@/components/admin/AdminFormField.vue'
import AdminQueryPanel from '@/components/admin/AdminQueryPanel.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'

import AdminDialogContent from '@/components/admin/AdminDialogContent.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAccess } from '@/lib/access'
import { saveBlob } from '@/lib/download'
import { permissionKeys } from '@/lib/permission-keys'

const router = useRouter()
const access = useAccess()
const jobPerms = permissionKeys.monitor.job

const jobTableColumns: AdminTableColumn[] = [
  { key: 'jobId', title: '任务编号' },
  { key: 'jobName', title: '任务名称' },
  { key: 'jobGroup', title: '任务组名' },
  { key: 'invokeTarget', title: '调用目标' },
  { key: 'cronExpression', title: 'Cron 表达式' },
  { key: 'status', title: '状态', headerClass: 'text-center', cellClass: 'text-center' },
  { key: 'nextValidTime', title: '下次执行时间' },
]

const loading = ref(false)
const submitting = ref(false)
const rows = ref<any[]>([])
const total = ref(0)
const selectedRows = ref<any[]>([])
const selectedRowKeys = ref<Array<string | number>>([])
const formOpen = ref(false)
const formTitle = ref('新增任务')
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailRow = ref<Record<string, any> | null>(null)

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  jobName: '',
  jobGroup: '',
  status: 'all',
})

const form = reactive(defaultForm())

const canAddJob = computed(() => access.can(jobPerms.add))
const canEditJob = computed(() => access.can(jobPerms.edit))
const canRemoveJob = computed(() => access.can(jobPerms.remove))
const canRunJob = computed(() => access.can(jobPerms.changeStatus))
const canChangeJobStatus = computed(() => access.can(jobPerms.changeStatus))
const canQueryJobLog = computed(() => access.can(jobPerms.query))
const canExportJob = computed(() => access.can(jobPerms.export))
const jobRowActions: AdminTableActionItem[] = [
  { label: '执行', icon: Play, visible: () => canRunJob.value, onClick: (row) => executeOnce(row) },
  { label: '日志', icon: FileText, visible: () => canQueryJobLog.value, onClick: (row) => openLogs(row) },
  { label: '修改', icon: Pencil, visible: () => canEditJob.value, onClick: (row) => openEdit(row) },
  { label: '删除', icon: Trash2, tone: 'danger', visible: () => canRemoveJob.value, onClick: (row) => removeRow(row) },
]

function resetSelection() {
  selectedRows.value = []
  selectedRowKeys.value = []
}

function defaultForm() {
  return {
    jobId: '',
    jobName: '',
    jobGroup: 'DEFAULT',
    invokeTarget: '',
    cronExpression: '',
    misfirePolicy: '3',
    concurrent: '1',
    status: '0',
    remark: '',
  }
}

function resetFormState() {
  Object.assign(form, defaultForm())
}

function statusText(value: string) {
  return value === '0' ? '正常' : '停用'
}

function misfirePolicyText(value: unknown) {
  switch (String(value ?? '3')) {
    case '1':
      return '立即执行'
    case '2':
      return '执行一次'
    case '3':
      return '放弃执行'
    default:
      return String(value ?? '--')
  }
}

function concurrentText(value: unknown) {
  return String(value ?? '1') === '0' ? '允许并发' : '禁止并发'
}

function buildQueryPayload() {
  return {
    jobName: queryParams.jobName || undefined,
    jobGroup: queryParams.jobGroup || undefined,
    status: queryParams.status === 'all' ? undefined : queryParams.status,
  }
}

async function loadList() {
  loading.value = true
  resetSelection()
  try {
    const response = await listJob({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      ...buildQueryPayload(),
    })
    rows.value = Array.isArray(response.rows) ? response.rows : []
    total.value = Number(response.total ?? 0)
  }
  catch (error) {
    toast.error('定时任务加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
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
  queryParams.jobName = ''
  queryParams.jobGroup = ''
  queryParams.status = 'all'
  await loadList()
}

function handleSelectionChange(rowsOnPage: Array<Record<string, any>>, keys: Array<string | number>) {
  selectedRows.value = rowsOnPage
  selectedRowKeys.value = keys
}

async function handleExport() {
  if (!access.require(jobPerms.export, '导出定时任务')) {
    return
  }

  try {
    const blob = await exportJob(buildQueryPayload())
    saveBlob(blob, 'job.xlsx')
    toast.success('定时任务数据导出成功')
  }
  catch (error) {
    toast.error('定时任务导出失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

function openCreate() {
  if (!access.require(jobPerms.add, '新增定时任务')) {
    return
  }
  resetFormState()
  formTitle.value = '新增任务'
  formOpen.value = true
}

async function openEditSelected() {
  const target = selectedRows.value[0]
  if (!target) {
    toast.warning('请选择一条需要修改的任务')
    return
  }
  await openEdit(target)
}

async function openEdit(row: Record<string, any>) {
  if (!access.require(jobPerms.edit, '修改定时任务')) {
    return
  }
  resetFormState()
  formTitle.value = '修改任务'
  try {
    const response = await getJob(row.jobId)
    Object.assign(form, defaultForm(), response.data ?? {}, {
      jobId: response.data?.jobId ? String(response.data.jobId) : '',
      jobGroup: String(response.data?.jobGroup ?? 'DEFAULT'),
      misfirePolicy: String(response.data?.misfirePolicy ?? '3'),
      concurrent: String(response.data?.concurrent ?? '1'),
      status: String(response.data?.status ?? '0'),
    })
    formOpen.value = true
  }
  catch (error) {
    toast.error('任务信息加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

function validateForm() {
  if (!form.jobName.trim()) {
    toast.warning('请输入任务名称')
    return false
  }
  if (!form.invokeTarget.trim()) {
    toast.warning('请输入调用目标')
    return false
  }
  if (!form.cronExpression.trim()) {
    toast.warning('请输入 Cron 表达式')
    return false
  }
  return true
}

async function submitForm() {
  const action = form.jobId ? jobPerms.edit : jobPerms.add
  const actionLabel = form.jobId ? '修改定时任务' : '新增定时任务'
  if (!access.require(action, actionLabel)) {
    return
  }
  if (!validateForm()) {
    return
  }

  submitting.value = true
  try {
    const payload = {
      ...form,
      jobId: form.jobId || undefined,
    }
    if (form.jobId) {
      await updateJob(payload)
      toast.success('任务修改成功')
    }
    else {
      await addJob(payload)
      toast.success('任务新增成功')
    }
    formOpen.value = false
    await loadList()
  }
  catch (error) {
    toast.error(form.jobId ? '任务修改失败' : '任务新增失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    submitting.value = false
  }
}

async function removeRow(row?: Record<string, any>) {
  if (!access.require(jobPerms.remove, '删除定时任务')) {
    return
  }

  const ids = row?.jobId ? [row.jobId] : selectedRows.value.map(item => item.jobId)
  if (!ids.length) {
    toast.warning('请先选择需要删除的任务')
    return
  }

  try {
    await delJob(ids.join(','))
    toast.success('任务删除成功')
    await loadList()
  }
  catch (error) {
    toast.error('任务删除失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function toggleStatus(row: Record<string, any>, value: boolean) {
  if (!access.require(jobPerms.changeStatus, `${value ? '启用' : '停用'}定时任务`)) {
    return
  }

  const targetStatus = value ? '0' : '1'
  try {
    await changeJobStatus(row.jobId, targetStatus)
    row.status = targetStatus
    toast.success(`已${value ? '启用' : '停用'}任务 ${row.jobName}`)
  }
  catch (error) {
    toast.error('任务状态更新失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function executeOnce(row: Record<string, any>) {
  if (!access.require(jobPerms.changeStatus, '执行一次定时任务')) {
    return
  }
  try {
    await runJob(row.jobId, String(row.jobGroup))
    toast.success(`已触发任务 ${row.jobName}`)
  }
  catch (error) {
    toast.error('任务执行失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function openDetail(row: Record<string, any>) {
  if (!access.require(jobPerms.query, '查看任务详情')) {
    return
  }

  detailOpen.value = true
  detailLoading.value = true
  detailRow.value = null
  try {
    const response = await getJob(row.jobId)
    detailRow.value = {
      ...row,
      ...(response.data ?? {}),
      jobId: response.data?.jobId ?? row.jobId,
      jobGroup: String(response.data?.jobGroup ?? row.jobGroup ?? 'DEFAULT'),
      misfirePolicy: String(response.data?.misfirePolicy ?? row.misfirePolicy ?? '3'),
      concurrent: String(response.data?.concurrent ?? row.concurrent ?? '1'),
      status: String(response.data?.status ?? row.status ?? '0'),
    }
  }
  catch (error) {
    detailOpen.value = false
    toast.error('任务详情加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    detailLoading.value = false
  }
}

function openSelectedLogs() {
  const target = selectedRows.value[0]
  if (!target) {
    toast.warning('请选择一条需要查看日志的任务')
    return
  }
  openLogs(target)
}

function openLogs(row: Record<string, any>) {
  if (!access.require(jobPerms.query, '查看调度日志')) {
    return
  }
  router.push(`/monitor/job-log/index/${row.jobId}`)
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
      <p class="admin-kicker">系统监控 / 定时任务</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight">定时任务</h1>
    </div>

    <AdminSectionCard title="任务列表" content-class="space-y-4">
      <template #headerExtra>
        <Badge variant="outline">已选 {{ selectedRows.length }} 项</Badge>
        <Button v-if="canAddJob" size="sm" @click="openCreate">新增任务</Button>
        <Button v-if="canEditJob" variant="outline" size="sm" :disabled="selectedRows.length !== 1" @click="openEditSelected">修改任务</Button>
        <Button v-if="canRemoveJob" variant="outline" size="sm" :disabled="selectedRows.length === 0" @click="removeRow()">删除所选</Button>
        <Button v-if="canQueryJobLog" variant="outline" size="sm" :disabled="selectedRows.length !== 1" @click="openSelectedLogs">日志</Button>
        <Button v-if="canExportJob" variant="outline" size="sm" @click="handleExport">导出任务</Button>
        <Button variant="outline" size="sm" @click="loadList">刷新</Button>
      </template>
      <AdminQueryPanel
        embedded
        grid-class="md:grid-cols-2 xl:grid-cols-3"
        @query="handleQuery"
        @reset="handleResetQuery"
      >
        <AdminFormField label="任务名称">
          <Input v-model="queryParams.jobName" placeholder="请输入任务名称" />
        </AdminFormField>
        <AdminFormField label="任务组名">
          <Input v-model="queryParams.jobGroup" placeholder="请输入任务组名" />
        </AdminFormField>
        <AdminFormField label="状态">
          <Select v-model="queryParams.status">
            <SelectTrigger><SelectValue placeholder="请选择状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="0">正常</SelectItem>
              <SelectItem value="1">停用</SelectItem>
            </SelectContent>
          </Select>
        </AdminFormField>
      </AdminQueryPanel>
      <AdminDataTable
        :columns="jobTableColumns"
        :rows="rows"
        row-key="jobId"
        :loading="loading"
        loading-text="正在加载任务数据..."
        show-selection
        :selected-row-keys="selectedRowKeys"
        empty-text="暂无数据"
        :actions="jobRowActions"
        action-header-class="w-[220px] text-right"
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
        <template #cell-jobName="{ row, value }">
          <Button variant="link" class="h-auto px-0 text-left text-sm font-medium" @click="openDetail(row)">
            {{ value }}
          </Button>
        </template>
        <template #cell-status="{ row }">
          <div class="flex items-center justify-center gap-2">
            <Switch v-if="canChangeJobStatus" :model-value="String(row.status) === '0'" @update:model-value="(value) => toggleStatus(row, Boolean(value))" />
            <Badge variant="outline">{{ statusText(String(row.status)) }}</Badge>
          </div>
        </template>
      </AdminDataTable>
    </AdminSectionCard>

    <Dialog v-model:open="detailOpen">
      <AdminDialogContent size="2xl">
        <DialogHeader>
          <DialogTitle>任务详情</DialogTitle>
          <DialogDescription>查看当前任务概况。</DialogDescription>
        </DialogHeader>

        <div v-if="detailLoading" class="py-10 text-center text-sm text-muted-foreground">正在加载详情...</div>
        <div v-else class="grid gap-4">
          <div class="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p class="text-sm font-medium">任务配置</p>
            <div class="mt-4 grid gap-4 md:grid-cols-2">
              <div class="space-y-1">
                <p class="text-sm text-muted-foreground">任务编号</p>
                <p class="text-sm font-medium">{{ detailRow?.jobId ?? '--' }}</p>
              </div>
              <div class="space-y-1">
                <p class="text-sm text-muted-foreground">任务名称</p>
                <p class="break-all text-sm font-medium">{{ detailRow?.jobName ?? '--' }}</p>
              </div>
              <div class="space-y-1">
                <p class="text-sm text-muted-foreground">任务分组</p>
                <p class="text-sm font-medium">{{ detailRow?.jobGroup ?? '--' }}</p>
              </div>
              <div class="space-y-1">
                <p class="text-sm text-muted-foreground">执行状态</p>
                <div>
                  <Badge :variant="String(detailRow?.status ?? '0') === '0' ? 'outline' : 'destructive'">{{ statusText(String(detailRow?.status ?? '0')) }}</Badge>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p class="text-sm font-medium">调度信息</p>
            <div class="mt-4 grid gap-4 md:grid-cols-2">
              <div class="space-y-1">
                <p class="text-sm text-muted-foreground">Cron 表达式</p>
                <p class="break-all font-mono text-sm">{{ detailRow?.cronExpression ?? '--' }}</p>
              </div>
              <div class="space-y-1">
                <p class="text-sm text-muted-foreground">下次执行时间</p>
                <p class="text-sm font-medium">{{ detailRow?.nextValidTime ?? '--' }}</p>
              </div>
              <div class="space-y-1">
                <p class="text-sm text-muted-foreground">执行策略</p>
                <div>
                  <Badge variant="destructive">{{ misfirePolicyText(detailRow?.misfirePolicy) }}</Badge>
                </div>
              </div>
              <div class="space-y-1">
                <p class="text-sm text-muted-foreground">并发执行</p>
                <div>
                  <Badge :variant="String(detailRow?.concurrent ?? '1') === '0' ? 'outline' : 'destructive'">{{ concurrentText(detailRow?.concurrent) }}</Badge>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p class="text-sm font-medium">执行方法</p>
            <div class="mt-4 rounded-xl border border-border/60 bg-background p-4">
              <p class="break-all font-mono text-sm">{{ detailRow?.invokeTarget ?? '--' }}</p>
            </div>
          </div>

          <div class="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p class="text-sm font-medium">元信息</p>
            <div class="mt-4 grid gap-4 md:grid-cols-2">
              <div class="space-y-1">
                <p class="text-sm text-muted-foreground">创建人</p>
                <p class="text-sm font-medium">{{ detailRow?.createBy ?? '--' }}</p>
              </div>
              <div class="space-y-1">
                <p class="text-sm text-muted-foreground">创建时间</p>
                <p class="text-sm font-medium">{{ detailRow?.createTime ?? '--' }}</p>
              </div>
              <div class="space-y-1">
                <p class="text-sm text-muted-foreground">更新人</p>
                <p class="text-sm font-medium">{{ detailRow?.updateBy ?? '--' }}</p>
              </div>
              <div class="space-y-1">
                <p class="text-sm text-muted-foreground">更新时间</p>
                <p class="text-sm font-medium">{{ detailRow?.updateTime ?? '--' }}</p>
              </div>
              <div v-if="detailRow?.remark" class="space-y-1 md:col-span-2">
                <p class="text-sm text-muted-foreground">备注</p>
                <p class="whitespace-pre-wrap text-sm font-medium">{{ detailRow?.remark }}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="detailOpen = false">关闭</Button>
        </DialogFooter>
      </AdminDialogContent>
    </Dialog>

    <Dialog v-model:open="formOpen">
      <AdminDialogContent size="xl" scroll="content" centered>
        <DialogHeader>
          <DialogTitle>{{ formTitle }}</DialogTitle>
          <DialogDescription>{{ form.jobId ? '修改任务信息。' : '填写任务信息。' }}</DialogDescription>
        </DialogHeader>

        <div class="grid gap-4 md:grid-cols-2">
          <AdminFormField label="任务名称">
            <Input v-model="form.jobName" placeholder="请输入任务名称" />
          </AdminFormField>
          <AdminFormField label="任务组名">
            <Input v-model="form.jobGroup" placeholder="请输入任务组名" />
          </AdminFormField>
          <AdminFormField label="调用目标" field-class="md:col-span-2">
            <Input v-model="form.invokeTarget" placeholder="请输入调用目标，例如 demoTask.demoParams('ry')" />
          </AdminFormField>
          <AdminFormField label="Cron 表达式">
            <Input v-model="form.cronExpression" placeholder="请输入 Cron 表达式" />
          </AdminFormField>
          <AdminFormField label="状态">
            <Select v-model="form.status">
              <SelectTrigger><SelectValue placeholder="请选择状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">正常</SelectItem>
                <SelectItem value="1">停用</SelectItem>
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField label="错过执行策略">
            <Select v-model="form.misfirePolicy">
              <SelectTrigger><SelectValue placeholder="请选择策略" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">立即执行</SelectItem>
                <SelectItem value="2">执行一次</SelectItem>
                <SelectItem value="3">放弃执行</SelectItem>
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField label="并发策略">
            <Select v-model="form.concurrent">
              <SelectTrigger><SelectValue placeholder="请选择并发策略" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">允许并发</SelectItem>
                <SelectItem value="1">禁止并发</SelectItem>
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField label="备注" field-class="md:col-span-2">
            <Textarea v-model="form.remark" class="min-h-28 sm:min-h-32" placeholder="请输入备注" />
          </AdminFormField>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="formOpen = false">取消</Button>
          <Button :disabled="submitting" @click="submitForm">{{ submitting ? '提交中...' : '提交' }}</Button>
        </DialogFooter>
      </AdminDialogContent>
    </Dialog>
  </div>
</template>















