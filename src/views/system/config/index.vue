<script setup lang="ts">
import { Download, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'

import type { AdminTableActionItem, AdminTableColumn } from '@/components/admin/data-table'

import { addConfig, delConfig, exportConfig, getConfig, listConfig, refreshCache, updateConfig } from '@/api/system/config'
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

const access = useAccess()
const configPerms = permissionKeys.system.config

const configTableColumns: AdminTableColumn[] = [
  { key: 'configId', title: '参数编号' },
  { key: 'configName', title: '参数名称' },
  { key: 'configKey', title: '参数键名' },
  { key: 'configValue', title: '参数键值' },
  { key: 'configType', title: '系统内置' },
  { key: 'createTime', title: '创建时间' },
]

const loading = ref(false)
const submitting = ref(false)
const rows = ref<any[]>([])
const total = ref(0)
const formOpen = ref(false)
const formTitle = ref('新增参数')

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  configName: '',
  configKey: '',
})

const form = reactive(defaultForm())

const canAddConfig = computed(() => access.can(configPerms.add))
const canEditConfig = computed(() => access.can(configPerms.edit))
const canRemoveConfig = computed(() => access.can(configPerms.remove))
const canExportConfig = computed(() => access.can(configPerms.export))
const canRefreshConfigCache = computed(() => access.can(configPerms.remove))

const configRowActions: AdminTableActionItem[] = [
  { label: '修改', icon: Pencil, visible: () => canEditConfig.value, onClick: row => openEdit(row) },
  { label: '删除', icon: Trash2, tone: 'danger', visible: () => canRemoveConfig.value, onClick: row => removeRow(row) },
]

function defaultForm() {
  return {
    configId: '',
    configName: '',
    configKey: '',
    configValue: '',
    configType: 'N',
    remark: '',
  }
}

function resetFormState() {
  Object.assign(form, defaultForm())
}

function configTypeText(value: string) {
  return value === 'Y' ? '是' : '否'
}

function buildQueryPayload() {
  return {
    pageNum: queryParams.pageNum,
    pageSize: queryParams.pageSize,
    configName: queryParams.configName || undefined,
    configKey: queryParams.configKey || undefined,
  }
}

async function loadList() {
  loading.value = true
  try {
    const response = await listConfig(buildQueryPayload())
    rows.value = Array.isArray(response.rows) ? response.rows : []
    total.value = Number(response.total ?? 0)
  }
  catch (error) {
    toast.error('参数列表加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
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
  queryParams.configName = ''
  queryParams.configKey = ''
  await loadList()
}

function openCreate() {
  if (!access.require(configPerms.add, '新增参数')) {
    return
  }

  resetFormState()
  formTitle.value = '新增参数'
  formOpen.value = true
}

async function openEdit(row: Record<string, any>) {
  if (!access.require(configPerms.edit, '修改参数')) {
    return
  }

  resetFormState()
  formTitle.value = '修改参数'
  try {
    const response = await getConfig(row.configId)
    Object.assign(form, defaultForm(), response.data ?? {}, {
      configId: response.data?.configId ? String(response.data.configId) : '',
      configType: String(response.data?.configType ?? 'N'),
    })
    formOpen.value = true
  }
  catch (error) {
    toast.error('参数信息加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

function validateForm() {
  if (!form.configName.trim()) {
    toast.warning('请输入参数名称')
    return false
  }
  if (!form.configKey.trim()) {
    toast.warning('请输入参数键名')
    return false
  }
  if (!form.configValue.trim()) {
    toast.warning('请输入参数键值')
    return false
  }
  return true
}

async function submitForm() {
  const action = form.configId ? configPerms.edit : configPerms.add
  const actionLabel = form.configId ? '修改参数' : '新增参数'
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
      configId: form.configId || undefined,
    }
    if (form.configId) {
      await updateConfig(payload)
      toast.success('参数修改成功')
    }
    else {
      await addConfig(payload)
      toast.success('参数新增成功')
    }
    formOpen.value = false
    await loadList()
  }
  catch (error) {
    toast.error(form.configId ? '参数修改失败' : '参数新增失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    submitting.value = false
  }
}

async function removeRow(row: Record<string, any>) {
  if (!access.require(configPerms.remove, '删除参数')) {
    return
  }

  try {
    await delConfig(row.configId)
    toast.success('参数删除成功')
    await loadList()
  }
  catch (error) {
    toast.error('参数删除失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function handleRefreshCache() {
  if (!access.require(configPerms.remove, '刷新参数缓存')) {
    return
  }

  try {
    await refreshCache()
    toast.success('参数缓存刷新成功')
  }
  catch (error) {
    toast.error('参数缓存刷新失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function handleExport() {
  if (!access.require(configPerms.export, '导出参数')) {
    return
  }

  try {
    const blob = await exportConfig(buildQueryPayload())
    saveBlob(blob, 'config.xlsx')
    toast.success('参数数据导出成功')
  }
  catch (error) {
    toast.error('参数数据导出失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
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
      <p class="admin-kicker">系统管理 / 参数设置</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight">参数设置</h1>
    </div>

    <AdminSectionCard title="参数列表" content-class="space-y-4">
      <template #headerExtra>
        <Button v-if="canAddConfig" size="sm" @click="openCreate">
          <Plus class="size-4" />
          新增参数
        </Button>
        <Button v-if="canExportConfig" variant="outline" size="sm" @click="handleExport">
          <Download class="size-4" />
          导出参数
        </Button>
        <Button v-if="canRefreshConfigCache" variant="outline" size="sm" @click="handleRefreshCache">
          <RefreshCw class="size-4" />
          刷新缓存
        </Button>
        <Button variant="outline" size="sm" @click="loadList">
          <RefreshCw class="size-4" />
          刷新
        </Button>
      </template>

      <AdminQueryPanel embedded grid-class="md:grid-cols-2" @query="handleQuery" @reset="handleResetQuery">
        <AdminFormField label="参数名称">
          <Input v-model="queryParams.configName" placeholder="请输入参数名称" />
        </AdminFormField>
        <AdminFormField label="参数键名">
          <Input v-model="queryParams.configKey" placeholder="请输入参数键名" />
        </AdminFormField>
      </AdminQueryPanel>

      <AdminDataTable
        :columns="configTableColumns"
        :rows="rows"
        row-key="configId"
        :loading="loading"
        loading-text="正在加载参数数据..."
        empty-text="暂无数据"
        :actions="configRowActions"
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
        <template #cell-configName="{ value }">
          <span class="font-medium">{{ value }}</span>
        </template>
        <template #cell-configType="{ row }">
          <Badge variant="outline">{{ configTypeText(String(row.configType ?? 'N')) }}</Badge>
        </template>
      </AdminDataTable>
    </AdminSectionCard>

    <Dialog v-model:open="formOpen">
      <DialogContent class="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{{ formTitle }}</DialogTitle>
          <DialogDescription>{{ form.configId ? '调整参数键名、键值与备注信息。' : '创建新的系统参数并补充键值信息。' }}</DialogDescription>
        </DialogHeader>

        <div class="grid gap-4 md:grid-cols-2">
          <AdminFormField label="参数名称">
            <Input v-model="form.configName" placeholder="请输入参数名称" />
          </AdminFormField>
          <AdminFormField label="参数键名">
            <Input v-model="form.configKey" placeholder="请输入参数键名" />
          </AdminFormField>
          <AdminFormField label="参数键值" field-class="md:col-span-2">
            <Input v-model="form.configValue" placeholder="请输入参数键值" />
          </AdminFormField>
          <AdminFormField label="系统内置">
            <Select v-model="form.configType">
              <SelectTrigger><SelectValue placeholder="请选择类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Y">是</SelectItem>
                <SelectItem value="N">否</SelectItem>
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
