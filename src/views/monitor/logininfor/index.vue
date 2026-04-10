<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'
import { LockOpen, Trash2 } from 'lucide-vue-next'

import type { AdminTableActionItem, AdminTableColumn } from '@/components/admin/data-table'

import { cleanLogininfor, delLogininfor, exportLogininfor, list, unlockLogininfor } from '@/api/monitor/logininfor'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminDateRangePicker from '@/components/admin/AdminDateRangePicker.vue'
import AdminFormField from '@/components/admin/AdminFormField.vue'
import AdminQueryPanel from '@/components/admin/AdminQueryPanel.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAccess } from '@/lib/access'
import { saveBlob } from '@/lib/download'
import { monitorResultLabel, monitorResultOptions } from '@/lib/monitor'
import { permissionKeys } from '@/lib/permission-keys'
import { buildDateRangeParams } from '@/lib/tree'

const access = useAccess()
const loginInforPerms = permissionKeys.monitor.logininfor

const loginInforTableColumns: AdminTableColumn[] = [
  { key: 'infoId', title: '访问编号' },
  { key: 'userName', title: '用户名称' },
  { key: 'ipaddr', title: '登录地址' },
  { key: 'loginLocation', title: '登录地点' },
  { key: 'os', title: '操作系统' },
  { key: 'browser', title: '浏览器' },
  { key: 'status', title: '登录状态', headerClass: 'text-center', cellClass: 'text-center' },
  { key: 'msg', title: '描述' },
  { key: 'loginTime', title: '访问时间' },
]

const loading = ref(false)
const rows = ref<any[]>([])
const total = ref(0)
const selectedRows = ref<any[]>([])
const selectedRowKeys = ref<Array<string | number>>([])

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  ipaddr: '',
  userName: '',
  status: 'all',
  beginDate: '',
  endDate: '',
})

const canRemoveLoginInfor = computed(() => access.can(loginInforPerms.remove))
const canUnlockLoginInfor = computed(() => access.can(loginInforPerms.unlock))
const canExportLoginInfor = computed(() => access.can(loginInforPerms.export))
const loginInforRowActions: AdminTableActionItem[] = [
  { label: '解锁', icon: LockOpen, visible: () => canUnlockLoginInfor.value, onClick: (row) => handleUnlock(row) },
  { label: '删除', icon: Trash2, tone: 'danger', visible: () => canRemoveLoginInfor.value, onClick: (row) => handleDelete(row) },
]

function resetSelection() {
  selectedRows.value = []
  selectedRowKeys.value = []
}

function buildQueryPayload() {
  return {
    ipaddr: queryParams.ipaddr || undefined,
    userName: queryParams.userName || undefined,
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
    toast.error('登录日志加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
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
  queryParams.ipaddr = ''
  queryParams.userName = ''
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
  if (!access.require(loginInforPerms.export, '导出登录日志')) {
    return
  }

  try {
    const blob = await exportLogininfor(buildQueryPayload())
    saveBlob(blob, 'logininfor.xlsx')
    toast.success('登录日志导出成功')
  }
  catch (error) {
    toast.error('登录日志导出失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function handleDelete(row?: Record<string, any>) {
  if (!access.require(loginInforPerms.remove, '删除登录日志')) {
    return
  }

  const ids = row?.infoId ? [row.infoId] : selectedRows.value.map(item => item.infoId)
  if (!ids.length) {
    toast.warning('请先选择需要删除的日志')
    return
  }

  try {
    await delLogininfor(ids.join(','))
    toast.success('登录日志删除成功')
    await loadList()
  }
  catch (error) {
    toast.error('登录日志删除失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function handleClean() {
  if (!access.require(loginInforPerms.remove, '清空登录日志')) {
    return
  }

  try {
    await cleanLogininfor()
    toast.success('登录日志清空成功')
    await loadList()
  }
  catch (error) {
    toast.error('登录日志清空失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function handleUnlock(row?: Record<string, any>) {
  if (!access.require(loginInforPerms.unlock, '解锁账号')) {
    return
  }

  const target = row ?? selectedRows.value[0]
  if (!target?.userName) {
    toast.warning('请选择一条需要解锁的记录')
    return
  }

  try {
    await unlockLogininfor(String(target.userName))
    toast.success(`用户 ${target.userName} 解锁成功`)
  }
  catch (error) {
    toast.error('用户解锁失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
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
      <p class="admin-kicker">系统监控 / 登录日志</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight">登录日志</h1>
    </div>

    <AdminSectionCard title="登录日志列表" content-class="space-y-4">
      <template #headerExtra>
        <Badge variant="outline">已选 {{ selectedRows.length }} 项</Badge>
        <Button v-if="canExportLoginInfor" variant="outline" size="sm" @click="handleExport">导出日志</Button>
        <Button v-if="canRemoveLoginInfor" variant="outline" size="sm" :disabled="selectedRows.length === 0" @click="handleDelete()">删除所选</Button>
        <Button v-if="canUnlockLoginInfor" variant="outline" size="sm" :disabled="selectedRows.length !== 1" @click="handleUnlock()">解锁账号</Button>
        <Button v-if="canRemoveLoginInfor" variant="outline" size="sm" @click="handleClean">清空日志</Button>
        <Button variant="outline" size="sm" @click="loadList">刷新</Button>
      </template>
      <AdminQueryPanel embedded grid-class="sm:grid-cols-2 xl:grid-cols-3" advanced-grid-class="sm:grid-cols-2 xl:grid-cols-3" @query="handleQuery" @reset="handleResetQuery">
        <AdminFormField label="登录地址">
          <Input v-model="queryParams.ipaddr" placeholder="请输入登录地址" />
        </AdminFormField>
        <AdminFormField label="用户名称">
          <Input v-model="queryParams.userName" placeholder="请输入用户名称" />
        </AdminFormField>
        <AdminFormField label="状态">
          <Select v-model="queryParams.status">
            <SelectTrigger><SelectValue placeholder="请选择状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="option in monitorResultOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
            </SelectContent>
          </Select>
        </AdminFormField>
        <template #advanced>
          <AdminFormField label="日期范围" field-class="md:col-span-2">
            <AdminDateRangePicker v-model:start="queryParams.beginDate" v-model:end="queryParams.endDate" />
          </AdminFormField>
        </template>
      </AdminQueryPanel>
      <AdminDataTable
        :columns="loginInforTableColumns"
        :rows="rows"
        row-key="infoId"
        :loading="loading"
        loading-text="正在加载登录日志..."
        empty-text="暂无登录日志"
        show-selection
        :selected-row-keys="selectedRowKeys"
        :actions="loginInforRowActions"
        action-header-class="w-[140px] text-right"
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
        <template #cell-userName="{ value }">
          <span class="font-medium">{{ value }}</span>
        </template>
        <template #cell-status="{ row }">
          <Badge :variant="String(row.status) === '0' ? 'default' : 'destructive'">
            {{ monitorResultLabel(row.status) }}
          </Badge>
        </template>
      </AdminDataTable>
    </AdminSectionCard>
  </div>
</template>









