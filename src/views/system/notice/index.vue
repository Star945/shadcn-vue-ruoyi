<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, reactive, ref } from 'vue'
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

import type { AdminTableActionItem, AdminTableColumn } from '@/components/admin/data-table'

import { addNotice, delNotice, getNotice, listNotice, updateNotice } from '@/api/system/notice'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminDialogContent from '@/components/admin/AdminDialogContent.vue'
import AdminFormField from '@/components/admin/AdminFormField.vue'
import AdminQueryPanel from '@/components/admin/AdminQueryPanel.vue'
const AdminRichTextEditor = defineAsyncComponent(() => import('@/components/admin/AdminRichTextEditor.vue'))
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAccess } from '@/lib/access'
import { permissionKeys } from '@/lib/permission-keys'

const access = useAccess()
const noticePerms = permissionKeys.system.notice

const noticeTableColumns: AdminTableColumn[] = [
  { key: 'noticeId', title: '公告编号' },
  { key: 'noticeTitle', title: '公告标题' },
  { key: 'noticeType', title: '公告类型' },
  { key: 'status', title: '状态' },
  { key: 'createBy', title: '创建人' },
  { key: 'createTime', title: '创建时间' },
]

const loading = ref(false)
const submitting = ref(false)
const rows = ref<any[]>([])
const total = ref(0)
const formOpen = ref(false)
const formTitle = ref('新增通知公告')

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  noticeTitle: '',
  noticeType: 'all',
  status: 'all',
})

const form = reactive(defaultForm())

const canAddNotice = computed(() => access.can(noticePerms.add))
const canEditNotice = computed(() => access.can(noticePerms.edit))
const canRemoveNotice = computed(() => access.can(noticePerms.remove))

const noticeRowActions: AdminTableActionItem[] = [
  { label: '修改', icon: Pencil, visible: () => canEditNotice.value, onClick: row => openEdit(row) },
  { label: '删除', icon: Trash2, tone: 'danger', visible: () => canRemoveNotice.value, onClick: row => removeRow(row) },
]

function defaultForm() {
  return {
    noticeId: '',
    noticeTitle: '',
    noticeType: '1',
    noticeContent: '',
    status: '0',
  }
}

function resetFormState() {
  Object.assign(form, defaultForm())
}

function noticeTypeText(value: string) {
  if (value === '1') return '通知'
  if (value === '2') return '公告'
  return '未设置'
}

function statusText(value: string) {
  return value === '0' ? '正常' : '关闭'
}

async function loadList() {
  loading.value = true
  try {
    const response = await listNotice({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      noticeTitle: queryParams.noticeTitle || undefined,
      noticeType: queryParams.noticeType === 'all' ? undefined : queryParams.noticeType,
      status: queryParams.status === 'all' ? undefined : queryParams.status,
    })
    rows.value = Array.isArray(response.rows) ? response.rows : []
    total.value = Number(response.total ?? 0)
  }
  catch (error) {
    toast.error('通知公告加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
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
  queryParams.noticeTitle = ''
  queryParams.noticeType = 'all'
  queryParams.status = 'all'
  await loadList()
}

function openCreate() {
  if (!access.require(noticePerms.add, '新增通知公告')) {
    return
  }
  resetFormState()
  formTitle.value = '新增通知公告'
  formOpen.value = true
}

async function openEdit(row: Record<string, any>) {
  if (!access.require(noticePerms.edit, '修改通知公告')) {
    return
  }

  resetFormState()
  formTitle.value = '修改通知公告'
  try {
    const response = await getNotice(row.noticeId)
    Object.assign(form, defaultForm(), response.data ?? {}, {
      noticeId: response.data?.noticeId ? String(response.data.noticeId) : '',
      noticeType: String(response.data?.noticeType ?? '1'),
      status: String(response.data?.status ?? '0'),
    })
    formOpen.value = true
  }
  catch (error) {
    toast.error('公告信息加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

function plainNoticeText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function validateForm() {
  if (!form.noticeTitle.trim()) {
    toast.warning('请输入公告标题')
    return false
  }
  if (!plainNoticeText(form.noticeContent)) {
    toast.warning('请输入公告内容')
    return false
  }
  return true
}
async function submitForm() {
  const action = form.noticeId ? noticePerms.edit : noticePerms.add
  const actionLabel = form.noticeId ? '修改通知公告' : '新增通知公告'
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
      noticeId: form.noticeId || undefined,
    }
    if (form.noticeId) {
      await updateNotice(payload)
      toast.success('通知公告修改成功')
    }
    else {
      await addNotice(payload)
      toast.success('通知公告新增成功')
    }
    formOpen.value = false
    await loadList()
  }
  catch (error) {
    toast.error(form.noticeId ? '通知公告修改失败' : '通知公告新增失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    submitting.value = false
  }
}

async function removeRow(row: Record<string, any>) {
  if (!access.require(noticePerms.remove, '删除通知公告')) {
    return
  }

  try {
    await delNotice(row.noticeId)
    toast.success('通知公告删除成功')
    await loadList()
  }
  catch (error) {
    toast.error('通知公告删除失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
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
      <p class="admin-kicker">系统管理 / 通知公告</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight">通知公告</h1>
    </div>

    <AdminSectionCard title="公告列表" content-class="space-y-4">
      <template #headerExtra>
        <Button v-if="canAddNotice" size="sm" @click="openCreate">
          <Plus class="size-4" />
          新增公告
        </Button>
        <Button variant="outline" size="sm" @click="loadList">
          <RefreshCw class="size-4" />
          刷新
        </Button>
      </template>

      <AdminQueryPanel embedded grid-class="md:grid-cols-2 xl:grid-cols-3" @query="handleQuery" @reset="handleResetQuery">
        <AdminFormField label="公告标题">
          <Input v-model="queryParams.noticeTitle" placeholder="请输入公告标题" />
        </AdminFormField>
        <AdminFormField label="公告类型">
          <Select v-model="queryParams.noticeType">
            <SelectTrigger><SelectValue placeholder="请选择公告类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="1">通知</SelectItem>
              <SelectItem value="2">公告</SelectItem>
            </SelectContent>
          </Select>
        </AdminFormField>
        <AdminFormField label="状态">
          <Select v-model="queryParams.status">
            <SelectTrigger><SelectValue placeholder="请选择状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="0">正常</SelectItem>
              <SelectItem value="1">关闭</SelectItem>
            </SelectContent>
          </Select>
        </AdminFormField>
      </AdminQueryPanel>

      <AdminDataTable
        :columns="noticeTableColumns"
        :rows="rows"
        row-key="noticeId"
        :loading="loading"
        loading-text="正在加载公告数据..."
        empty-text="暂无数据"
        :actions="noticeRowActions"
        action-header-class="w-[180px] text-right"
        :show-pagination="true"
        :total="total"
        :page-num="queryParams.pageNum"
        :page-size="queryParams.pageSize"
        @update:page-size="changePageSize"
        @update:page-num="changePage($event - queryParams.pageNum)"
        @previous="changePage(-1)"
        @next="changePage(1)"
      >
        <template #cell-noticeTitle="{ value }">
          <span class="font-medium">{{ value }}</span>
        </template>
        <template #cell-noticeType="{ row }">
          <Badge variant="outline">{{ noticeTypeText(String(row.noticeType ?? '1')) }}</Badge>
        </template>
        <template #cell-status="{ row }">
          <AdminStatusBadge :label="statusText(String(row.status ?? '0'))" />
        </template>
      </AdminDataTable>
    </AdminSectionCard>
    <Dialog v-model:open="formOpen">
      <AdminDialogContent size="xl" scroll="content" centered>
        <DialogHeader>
          <DialogTitle>{{ formTitle }}</DialogTitle>
        </DialogHeader>

        <div class="grid gap-4 md:grid-cols-2">
          <AdminFormField label="公告标题" field-class="md:col-span-2">
            <Input v-model="form.noticeTitle" placeholder="请输入公告标题" />
          </AdminFormField>
          <AdminFormField label="公告类型">
            <Select v-model="form.noticeType">
              <SelectTrigger><SelectValue placeholder="请选择公告类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">通知</SelectItem>
                <SelectItem value="2">公告</SelectItem>
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField label="状态">
            <Select v-model="form.status">
              <SelectTrigger><SelectValue placeholder="请选择状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">正常</SelectItem>
                <SelectItem value="1">关闭</SelectItem>
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField label="公告内容" field-class="md:col-span-2">
            <AdminRichTextEditor v-model="form.noticeContent" placeholder="请输入公告内容" min-height-class="min-h-52 sm:min-h-64" />
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
