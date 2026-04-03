<script setup lang="ts">
import { Download, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'

import type { AdminTableActionItem, AdminTableColumn } from '@/components/admin/data-table'

import { addPost, delPost, exportPost, getPost, listPost, updatePost } from '@/api/system/post'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminFormField from '@/components/admin/AdminFormField.vue'
import AdminQueryPanel from '@/components/admin/AdminQueryPanel.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAccess } from '@/lib/access'
import { saveBlob } from '@/lib/download'
import { permissionKeys } from '@/lib/permission-keys'

const access = useAccess()
const postPerms = permissionKeys.system.post

const postTableColumns: AdminTableColumn[] = [
  { key: 'postId', title: '岗位编号' },
  { key: 'postCode', title: '岗位编码' },
  { key: 'postName', title: '岗位名称' },
  { key: 'postSort', title: '显示顺序' },
  { key: 'status', title: '状态' },
  { key: 'createTime', title: '创建时间' },
]

const loading = ref(false)
const submitting = ref(false)
const rows = ref<any[]>([])
const total = ref(0)
const formOpen = ref(false)
const formTitle = ref('新增岗位')

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  postCode: '',
  postName: '',
  status: 'all',
})

const form = reactive(defaultForm())

const canAddPost = computed(() => access.can(postPerms.add))
const canEditPost = computed(() => access.can(postPerms.edit))
const canRemovePost = computed(() => access.can(postPerms.remove))
const canExportPost = computed(() => access.can(postPerms.export))
const postRowActions: AdminTableActionItem[] = [
  { label: '修改', icon: Pencil, visible: () => canEditPost.value, onClick: (row) => openEdit(row) },
  { label: '删除', icon: Trash2, tone: 'danger', visible: () => canRemovePost.value, onClick: (row) => removeRow(row) },
]

function defaultForm() {
  return {
    postId: '',
    postCode: '',
    postName: '',
    postSort: 1,
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

function buildQueryPayload() {
  return {
    pageNum: queryParams.pageNum,
    pageSize: queryParams.pageSize,
    postCode: queryParams.postCode || undefined,
    postName: queryParams.postName || undefined,
    status: queryParams.status === 'all' ? undefined : queryParams.status,
  }
}

async function loadList() {
  loading.value = true
  try {
    const response = await listPost(buildQueryPayload())
    rows.value = Array.isArray(response.rows) ? response.rows : []
    total.value = Number(response.total ?? 0)
  }
  catch (error) {
    toast.error('岗位列表加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
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
  queryParams.postCode = ''
  queryParams.postName = ''
  queryParams.status = 'all'
  await loadList()
}

function openCreate() {
  if (!access.require(postPerms.add, '新增岗位')) {
    return
  }

  resetFormState()
  formTitle.value = '新增岗位'
  formOpen.value = true
}

async function openEdit(row: Record<string, any>) {
  if (!access.require(postPerms.edit, '修改岗位')) {
    return
  }

  resetFormState()
  formTitle.value = '修改岗位'
  try {
    const response = await getPost(row.postId)
    Object.assign(form, defaultForm(), response.data ?? {}, {
      postId: response.data?.postId ? String(response.data.postId) : '',
      postSort: Number(response.data?.postSort ?? 1),
      status: String(response.data?.status ?? '0'),
    })
    formOpen.value = true
  }
  catch (error) {
    toast.error('岗位信息加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

function validateForm() {
  if (!form.postCode.trim()) {
    toast.warning('请输入岗位编码')
    return false
  }
  if (!form.postName.trim()) {
    toast.warning('请输入岗位名称')
    return false
  }
  if (!Number.isFinite(Number(form.postSort)) || Number(form.postSort) < 0) {
    toast.warning('显示顺序必须是大于等于 0 的数字')
    return false
  }
  return true
}

async function submitForm() {
  const action = form.postId ? postPerms.edit : postPerms.add
  const actionLabel = form.postId ? '修改岗位' : '新增岗位'
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
      postId: form.postId || undefined,
    }
    if (form.postId) {
      await updatePost(payload)
      toast.success('岗位修改成功')
    }
    else {
      await addPost(payload)
      toast.success('岗位新增成功')
    }
    formOpen.value = false
    await loadList()
  }
  catch (error) {
    toast.error(form.postId ? '岗位修改失败' : '岗位新增失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    submitting.value = false
  }
}

async function removeRow(row: Record<string, any>) {
  if (!access.require(postPerms.remove, '删除岗位')) {
    return
  }

  try {
    await delPost(row.postId)
    toast.success('岗位删除成功')
    await loadList()
  }
  catch (error) {
    toast.error('岗位删除失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function handleExport() {
  if (!access.require(postPerms.export, '导出岗位')) {
    return
  }

  try {
    const blob = await exportPost(buildQueryPayload())
    saveBlob(blob, 'post.xlsx')
    toast.success('岗位数据导出成功')
  }
  catch (error) {
    toast.error('岗位数据导出失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
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
        <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">系统管理 / 岗位管理</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight">岗位管理</h1>
      </div>

    <AdminQueryPanel
      
      grid-class="md:grid-cols-2 xl:grid-cols-3"
      @query="handleQuery"
      @reset="handleResetQuery"
    >
      <AdminFormField label="岗位编码">
        <Input v-model="queryParams.postCode" placeholder="请输入岗位编码" />
      </AdminFormField>
      <AdminFormField label="岗位名称">
        <Input v-model="queryParams.postName" placeholder="请输入岗位名称" />
      </AdminFormField>
      <AdminFormField label="状态">
        <Select v-model="queryParams.status">
          <SelectTrigger>
            <SelectValue placeholder="请选择状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="0">正常</SelectItem>
            <SelectItem value="1">停用</SelectItem>
          </SelectContent>
        </Select>
      </AdminFormField>
    </AdminQueryPanel>

    <AdminSectionCard title="岗位列表">
      <template #headerExtra>
        <Button v-if="canAddPost" size="sm" @click="openCreate">
          <Plus class="size-4" />
          新增岗位
        </Button>
        <Button v-if="canExportPost" variant="outline" size="sm" @click="handleExport">
          <Download class="size-4" />
          导出岗位
        </Button>
        <Button variant="outline" size="sm" @click="loadList">
          <RefreshCw class="size-4" />
          刷新
        </Button>
      </template>
      <AdminDataTable
        :columns="postTableColumns"
        :rows="rows"
        row-key="postId"
        :loading="loading"
        loading-text="正在加载岗位数据..."
        empty-text="暂无数据"
        :actions="postRowActions"
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
        <template #cell-postName="{ value }">
          <span class="font-medium">{{ value }}</span>
        </template>
        <template #cell-status="{ row }">
          <Badge variant="outline">{{ statusText(String(row.status ?? '0')) }}</Badge>
        </template>
      </AdminDataTable>
    </AdminSectionCard>

    <Dialog v-model:open="formOpen">
      <DialogContent class="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{{ formTitle }}</DialogTitle>

        </DialogHeader>

        <div class="grid gap-4 md:grid-cols-2">
          <AdminFormField label="岗位编码">
            <Input v-model="form.postCode" placeholder="请输入岗位编码" />
          </AdminFormField>
          <AdminFormField label="岗位名称">
            <Input v-model="form.postName" placeholder="请输入岗位名称" />
          </AdminFormField>
          <AdminFormField label="显示顺序">
            <Input v-model="form.postSort" type="number" min="0" />
          </AdminFormField>
          <AdminFormField label="状态">
            <Select v-model="form.status">
              <SelectTrigger>
                <SelectValue placeholder="请选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">正常</SelectItem>
                <SelectItem value="1">停用</SelectItem>
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
      </DialogContent>
    </Dialog>
  </div>
</template>












