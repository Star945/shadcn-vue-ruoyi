<script setup lang="ts">
import { Download, List, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import type { AdminTableActionItem, AdminTableColumn } from '@/components/admin/data-table'

import { addType, delType, exportType, getType, listType, refreshCache, updateType } from '@/api/system/dict/type'
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

const router = useRouter()
const access = useAccess()
const dictPerms = permissionKeys.system.dict

const dictTableColumns: AdminTableColumn[] = [
  { key: 'dictId', title: '字典编号' },
  { key: 'dictName', title: '字典名称' },
  { key: 'dictType', title: '字典类型' },
  { key: 'status', title: '状态' },
  { key: 'createTime', title: '创建时间' },
]

const loading = ref(false)
const submitting = ref(false)
const rows = ref<any[]>([])
const total = ref(0)
const formOpen = ref(false)
const formTitle = ref('新增字典类型')

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  dictName: '',
  dictType: '',
  status: 'all',
})

const form = reactive(defaultForm())

const canAddDict = computed(() => access.can(dictPerms.add))
const canEditDict = computed(() => access.can(dictPerms.edit))
const canRemoveDict = computed(() => access.can(dictPerms.remove))
const canExportDict = computed(() => access.can(dictPerms.export))
const canViewDictData = computed(() => access.can(dictPerms.list))
const canRefreshDictCache = computed(() => access.can(dictPerms.remove))
const dictRowActions: AdminTableActionItem[] = [
  { label: '数据', icon: List, visible: () => canViewDictData.value, onClick: (row) => openData(row) },
  { label: '修改', icon: Pencil, visible: () => canEditDict.value, onClick: (row) => openEdit(row) },
  { label: '删除', icon: Trash2, tone: 'danger', visible: () => canRemoveDict.value, onClick: (row) => removeRow(row) },
]

function defaultForm() {
  return {
    dictId: '',
    dictName: '',
    dictType: '',
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
    dictName: queryParams.dictName || undefined,
    dictType: queryParams.dictType || undefined,
    status: queryParams.status === 'all' ? undefined : queryParams.status,
  }
}

async function loadList() {
  loading.value = true
  try {
    const response = await listType(buildQueryPayload())
    rows.value = Array.isArray(response.rows) ? response.rows : []
    total.value = Number(response.total ?? 0)
  }
  catch (error) {
    toast.error('字典列表加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
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
  queryParams.dictName = ''
  queryParams.dictType = ''
  queryParams.status = 'all'
  await loadList()
}

function openCreate() {
  if (!access.require(dictPerms.add, '新增字典类型')) {
    return
  }

  resetFormState()
  formTitle.value = '新增字典类型'
  formOpen.value = true
}

async function openEdit(row: Record<string, any>) {
  if (!access.require(dictPerms.edit, '修改字典类型')) {
    return
  }

  resetFormState()
  formTitle.value = '修改字典类型'
  try {
    const response = await getType(row.dictId)
    Object.assign(form, defaultForm(), response.data ?? {}, {
      dictId: response.data?.dictId ? String(response.data.dictId) : '',
      status: String(response.data?.status ?? '0'),
    })
    formOpen.value = true
  }
  catch (error) {
    toast.error('字典信息加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

function validateForm() {
  if (!form.dictName.trim()) {
    toast.warning('请输入字典名称')
    return false
  }
  if (!form.dictType.trim()) {
    toast.warning('请输入字典类型')
    return false
  }
  return true
}

async function submitForm() {
  const action = form.dictId ? dictPerms.edit : dictPerms.add
  const actionLabel = form.dictId ? '修改字典类型' : '新增字典类型'
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
      dictId: form.dictId || undefined,
    }
    if (form.dictId) {
      await updateType(payload)
      toast.success('字典修改成功')
    }
    else {
      await addType(payload)
      toast.success('字典新增成功')
    }
    formOpen.value = false
    await loadList()
  }
  catch (error) {
    toast.error(form.dictId ? '字典修改失败' : '字典新增失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    submitting.value = false
  }
}

async function removeRow(row: Record<string, any>) {
  if (!access.require(dictPerms.remove, '删除字典类型')) {
    return
  }

  try {
    await delType(row.dictId)
    toast.success('字典删除成功')
    await loadList()
  }
  catch (error) {
    toast.error('字典删除失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

function openData(row: Record<string, any>) {
  if (!access.require(dictPerms.list, '查看字典数据')) {
    return
  }
  router.push(`/system/dict-data/index/${row.dictId}`)
}

async function handleRefreshCache() {
  if (!access.require(dictPerms.remove, '刷新字典缓存')) {
    return
  }

  try {
    await refreshCache()
    toast.success('字典缓存刷新成功')
  }
  catch (error) {
    toast.error('字典缓存刷新失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function handleExport() {
  if (!access.require(dictPerms.export, '导出字典类型')) {
    return
  }

  try {
    const blob = await exportType(buildQueryPayload())
    saveBlob(blob, 'dictType.xlsx')
    toast.success('字典类型导出成功')
  }
  catch (error) {
    toast.error('字典类型导出失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
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
        <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">系统管理 / 字典管理</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight">字典管理</h1>
      </div>

    <AdminQueryPanel
      
      grid-class="md:grid-cols-2 xl:grid-cols-3"
      @query="handleQuery"
      @reset="handleResetQuery"
    >
      <AdminFormField label="字典名称">
        <Input v-model="queryParams.dictName" placeholder="请输入字典名称" />
      </AdminFormField>
      <AdminFormField label="字典类型">
        <Input v-model="queryParams.dictType" placeholder="请输入字典类型" />
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

    <AdminSectionCard title="字典类型列表">
      <template #headerExtra>
        <Button v-if="canAddDict" size="sm" @click="openCreate">
          <Plus class="size-4" />
          新增字典
        </Button>
        <Button v-if="canExportDict" variant="outline" size="sm" @click="handleExport">
          <Download class="size-4" />
          导出字典
        </Button>
        <Button v-if="canRefreshDictCache" variant="outline" size="sm" @click="handleRefreshCache">
          <RefreshCw class="size-4" />
          刷新缓存
        </Button>
        <Button variant="outline" size="sm" @click="loadList">
          <RefreshCw class="size-4" />
          刷新
        </Button>
      </template>
      <AdminDataTable
        :columns="dictTableColumns"
        :rows="rows"
        row-key="dictId"
        :loading="loading"
        loading-text="正在加载字典数据..."
        empty-text="暂无数据"
        :actions="dictRowActions"
        action-header-class="w-[220px] text-right"
        :show-pagination="true"
        :total="total"
        :page-num="queryParams.pageNum"
        :page-size="queryParams.pageSize"
        @update:page-size="changePageSize"
        @update:page-num="changePage($event - queryParams.pageNum)"
        @previous="changePage(-1)"
        @next="changePage(1)"
      >
        <template #cell-dictName="{ value }">
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
          <AdminFormField label="字典名称">
            <Input v-model="form.dictName" placeholder="请输入字典名称" />
          </AdminFormField>
          <AdminFormField label="字典类型">
            <Input v-model="form.dictType" placeholder="请输入字典类型" />
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











