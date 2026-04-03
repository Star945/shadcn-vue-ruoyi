<script setup lang="ts">
import { ArrowLeft, Download, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import type { AdminTableActionItem, AdminTableColumn } from '@/components/admin/data-table'

import { addData, delData, exportData, getData, listData, updateData } from '@/api/system/dict/data'
import { getType } from '@/api/system/dict/type'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminFormField from '@/components/admin/AdminFormField.vue'
import AdminQueryPanel from '@/components/admin/AdminQueryPanel.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAccess } from '@/lib/access'
import { saveBlob } from '@/lib/download'
import { permissionKeys } from '@/lib/permission-keys'

const route = useRoute()
const router = useRouter()
const access = useAccess()
const dictPerms = permissionKeys.system.dict

const dictDataColumns: AdminTableColumn[] = [
  { key: 'dictCode', title: '字典编码' },
  { key: 'dictLabel', title: '字典标签' },
  { key: 'dictValue', title: '字典键值' },
  { key: 'dictSort', title: '字典排序' },
  { key: 'status', title: '状态' },
  { key: 'remark', title: '备注' },
]

const loading = ref(false)
const submitting = ref(false)
const rows = ref<any[]>([])
const total = ref(0)
const formOpen = ref(false)
const formTitle = ref('新增字典数据')
const currentDictType = ref('')
const currentDictName = ref('字典数据')

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  dictLabel: '',
  dictValue: '',
  status: 'all',
})

const form = reactive(defaultForm())

const canAddDictData = computed(() => access.can(dictPerms.add))
const canEditDictData = computed(() => access.can(dictPerms.edit))
const canRemoveDictData = computed(() => access.can(dictPerms.remove))
const canExportDictData = computed(() => access.can(dictPerms.export))
const dictDataRowActions: AdminTableActionItem[] = [
  { label: '修改', icon: Pencil, visible: () => canEditDictData.value, onClick: (row) => openEdit(row) },
  { label: '删除', icon: Trash2, tone: 'danger', visible: () => canRemoveDictData.value, onClick: (row) => removeRow(row) },
]

function defaultForm() {
  return {
    dictCode: '',
    dictLabel: '',
    dictValue: '',
    dictSort: 1,
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
    dictType: currentDictType.value,
    dictLabel: queryParams.dictLabel || undefined,
    dictValue: queryParams.dictValue || undefined,
    status: queryParams.status === 'all' ? undefined : queryParams.status,
  }
}

async function loadContext() {
  const dictId = String(route.params.dictId ?? '')
  if (!dictId) {
    return
  }

  try {
    const response = await getType(dictId)
    currentDictType.value = String(response.data?.dictType ?? '')
    currentDictName.value = String(response.data?.dictName ?? '字典数据')
  }
  catch (error) {
    toast.error('字典上下文加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function loadList() {
  if (!currentDictType.value) {
    return
  }

  loading.value = true
  try {
    const response = await listData(buildQueryPayload())
    rows.value = Array.isArray(response.rows) ? response.rows : []
    total.value = Number(response.total ?? 0)
  }
  catch (error) {
    toast.error('字典数据加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
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
  queryParams.dictLabel = ''
  queryParams.dictValue = ''
  queryParams.status = 'all'
  await loadList()
}

function openCreate() {
  if (!access.require(dictPerms.add, '新增字典数据')) {
    return
  }

  resetFormState()
  formTitle.value = '新增字典数据'
  formOpen.value = true
}

async function openEdit(row: Record<string, any>) {
  if (!access.require(dictPerms.edit, '修改字典数据')) {
    return
  }

  resetFormState()
  formTitle.value = '修改字典数据'
  try {
    const response = await getData(row.dictCode)
    Object.assign(form, defaultForm(), response.data ?? {}, {
      dictCode: response.data?.dictCode ? String(response.data.dictCode) : '',
      dictSort: Number(response.data?.dictSort ?? 1),
      status: String(response.data?.status ?? '0'),
    })
    formOpen.value = true
  }
  catch (error) {
    toast.error('字典数据信息加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

function validateForm() {
  if (!form.dictLabel.trim()) {
    toast.warning('请输入字典标签')
    return false
  }
  if (!form.dictValue.trim()) {
    toast.warning('请输入字典键值')
    return false
  }
  if (!Number.isFinite(Number(form.dictSort)) || Number(form.dictSort) < 0) {
    toast.warning('字典排序必须是大于等于 0 的数字')
    return false
  }
  return true
}

async function submitForm() {
  const action = form.dictCode ? dictPerms.edit : dictPerms.add
  const actionLabel = form.dictCode ? '修改字典数据' : '新增字典数据'
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
      dictCode: form.dictCode || undefined,
      dictType: currentDictType.value,
    }
    if (form.dictCode) {
      await updateData(payload)
      toast.success('字典数据修改成功')
    }
    else {
      await addData(payload)
      toast.success('字典数据新增成功')
    }
    formOpen.value = false
    await loadList()
  }
  catch (error) {
    toast.error(form.dictCode ? '字典数据修改失败' : '字典数据新增失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    submitting.value = false
  }
}

async function removeRow(row: Record<string, any>) {
  if (!access.require(dictPerms.remove, '删除字典数据')) {
    return
  }

  try {
    await delData(row.dictCode)
    toast.success('字典数据删除成功')
    await loadList()
  }
  catch (error) {
    toast.error('字典数据删除失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function handleExport() {
  if (!access.require(dictPerms.export, '导出字典数据')) {
    return
  }

  try {
    const blob = await exportData(buildQueryPayload())
    saveBlob(blob, 'dictData.xlsx')
    toast.success('字典数据导出成功')
  }
  catch (error) {
    toast.error('字典数据导出失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
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
        <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">系统管理 / 字典数据</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight">{{ currentDictName }}</h1>
      </div>

    <AdminQueryPanel
      
      grid-class="md:grid-cols-2 xl:grid-cols-3"
      @query="handleQuery"
      @reset="handleResetQuery"
    >
      <AdminFormField label="字典标签">
        <Input v-model="queryParams.dictLabel" placeholder="请输入字典标签" />
      </AdminFormField>
      <AdminFormField label="字典键值">
        <Input v-model="queryParams.dictValue" placeholder="请输入字典键值" />
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

        <AdminSectionCard title="字典数据列表">
      <template #headerExtra>
        <Button v-if="canAddDictData" size="sm" @click="openCreate">
          <Plus class="size-4" />
          新增字典数据
        </Button>
        <Button v-if="canExportDictData" variant="outline" size="sm" @click="handleExport">
          <Download class="size-4" />
          导出数据
        </Button>
        <Button variant="outline" size="sm" @click="router.push('/system/dict')">
          <ArrowLeft class="size-4" />
          返回类型
        </Button>
        <Button variant="outline" size="sm" @click="loadList">
          <RefreshCw class="size-4" />
          刷新
        </Button>
      </template>
      <AdminDataTable
        :columns="dictDataColumns"
        :rows="rows"
        row-key="dictCode"
        :loading="loading"
        loading-text="正在加载字典数据..."
        empty-text="暂无数据"
        :actions="dictDataRowActions"
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
        <template #cell-dictLabel="{ value }">
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
          <DialogDescription>{{ form.dictCode ? '修改字典数据。' : '新增字典数据。' }}</DialogDescription>
        </DialogHeader>

        <div class="grid gap-4 md:grid-cols-2">
          <AdminFormField label="字典标签">
            <Input v-model="form.dictLabel" placeholder="请输入字典标签" />
          </AdminFormField>
          <AdminFormField label="字典键值">
            <Input v-model="form.dictValue" placeholder="请输入字典键值" />
          </AdminFormField>
          <AdminFormField label="字典排序">
            <Input v-model="form.dictSort" type="number" min="0" />
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









