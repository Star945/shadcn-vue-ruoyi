<script setup lang="ts">
import { Database, Download, Eye, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import type { AdminTableActionItem, AdminTableColumn } from '@/components/admin/data-table'

import { batchGenCode, createTable, delTable, genCode, importTable as importGenTable, listDbTable, listTable, previewTable, synchDb } from '@/api/tool/gen'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminDateRangePicker from '@/components/admin/AdminDateRangePicker.vue'
import AdminFormField from '@/components/admin/AdminFormField.vue'
import AdminQueryPanel from '@/components/admin/AdminQueryPanel.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'

import AdminDialogContent from '@/components/admin/AdminDialogContent.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAccess } from '@/lib/access'
import { saveBlob } from '@/lib/download'
import { permissionKeys } from '@/lib/permission-keys'
import { buildDateRangeParams } from '@/lib/tree'
import { previewFileName, tplCategoryLabel, tplWebTypeOptions } from '@/lib/tool-gen'

const router = useRouter()
const route = useRoute()
const access = useAccess()
const toolGenPerms = permissionKeys.tool.gen

const tableColumns: AdminTableColumn[] = [
  { key: 'tableName', title: '表名称' },
  { key: 'tableComment', title: '表描述' },
  { key: 'className', title: '实体类' },
  { key: 'tplCategory', title: '模板类型', headerClass: 'text-center', cellClass: 'text-center' },
  { key: 'createTime', title: '创建时间' },
  { key: 'updateTime', title: '更新时间' },
]

const dbTableColumns: AdminTableColumn[] = [
  { key: 'tableName', title: '表名称' },
  { key: 'tableComment', title: '表描述' },
  { key: 'createTime', title: '创建时间' },
  { key: 'updateTime', title: '更新时间' },
]

const loading = ref(false)
const rows = ref<any[]>([])
const total = ref(0)
const selectedRows = ref<any[]>([])
const selectedRowKeys = ref<Array<string | number>>([])

const previewOpen = ref(false)
const previewLoading = ref(false)
const previewData = ref<Record<string, string>>({})
const activePreviewPath = ref('')

const importOpen = ref(false)
const importLoading = ref(false)
const importRows = ref<any[]>([])
const importTotal = ref(0)
const importSelectedRows = ref<any[]>([])
const importSelectedRowKeys = ref<Array<string | number>>([])

const createOpen = ref(false)
const creating = ref(false)

const queryParams = reactive({
  pageNum: Number(route.query.pageNum ?? 1),
  pageSize: 10,
  tableName: '',
  tableComment: '',
  beginDate: '',
  endDate: '',
  orderByColumn: 'createTime',
  isAsc: 'desc',
})

const importQuery = reactive({
  pageNum: 1,
  pageSize: 10,
  tableName: '',
  tableComment: '',
  tplWebType: 'element-plus',
})

const createForm = reactive({
  sql: '',
  tplWebType: 'element-plus',
})

const previewEntries = computed(() => Object.entries(previewData.value).map(([path, content]) => ({
  path,
  label: previewFileName(path),
  content,
})))

const activePreviewContent = computed(() => previewEntries.value.find(item => item.path === activePreviewPath.value)?.content ?? '')
const singleSelection = computed(() => selectedRows.value.length === 1)
const hasSelection = computed(() => selectedRows.value.length > 0)
const canGenCode = computed(() => access.can(toolGenPerms.code))
const canImportGen = computed(() => access.can(toolGenPerms.import))
const canEditGen = computed(() => access.can(toolGenPerms.edit))
const canRemoveGen = computed(() => access.can(toolGenPerms.remove))
const canPreviewGen = computed(() => access.can(toolGenPerms.preview))
const canCreateGenTable = computed(() => access.hasRole('admin'))
const genRowActions: AdminTableActionItem[] = [
  { label: '预览', icon: Eye, visible: () => canPreviewGen.value, onClick: (row) => handlePreview(row) },
  { label: '编辑', icon: Pencil, visible: () => canEditGen.value, onClick: (row) => handleEdit(row) },
  { label: '同步', icon: RefreshCw, visible: () => canEditGen.value, onClick: (row) => handleSynch(row) },
  { label: '生成', icon: Download, visible: () => canGenCode.value, onClick: (row) => handleGenerate(row) },
  { label: '删除', icon: Trash2, tone: 'danger', visible: () => canRemoveGen.value, onClick: (row) => handleDelete(row) },
]

function resetSelection() {
  selectedRows.value = []
  selectedRowKeys.value = []
}

function resetImportSelection() {
  importSelectedRows.value = []
  importSelectedRowKeys.value = []
}

function ensureCreatePermission() {
  if (canCreateGenTable.value) {
    return true
  }

  toast.error('无权限', {
    description: '仅管理员可以执行建表语句。',
  })
  return false
}

async function loadList() {
  loading.value = true
  resetSelection()
  try {
    const response = await listTable({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      tableName: queryParams.tableName || undefined,
      tableComment: queryParams.tableComment || undefined,
      orderByColumn: queryParams.orderByColumn,
      isAsc: queryParams.isAsc,
      ...buildDateRangeParams(queryParams.beginDate || undefined, queryParams.endDate || undefined),
    })
    rows.value = Array.isArray(response.rows) ? response.rows : []
    total.value = Number(response.total ?? 0)
  }
  catch (error) {
    toast.error('代码生成列表加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    loading.value = false
  }
}

async function loadDbTables() {
  importLoading.value = true
  resetImportSelection()
  try {
    const response = await listDbTable({
      pageNum: importQuery.pageNum,
      pageSize: importQuery.pageSize,
      tableName: importQuery.tableName || undefined,
      tableComment: importQuery.tableComment || undefined,
    })
    importRows.value = Array.isArray(response.rows) ? response.rows : []
    importTotal.value = Number(response.total ?? 0)
  }
  catch (error) {
    toast.error('数据库表列表加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    importLoading.value = false
  }
}

async function handleQuery() {
  queryParams.pageNum = 1
  await loadList()
}

async function handleResetQuery() {
  queryParams.pageNum = 1
  queryParams.pageSize = 10
  queryParams.tableName = ''
  queryParams.tableComment = ''
  queryParams.beginDate = ''
  queryParams.endDate = ''
  queryParams.orderByColumn = 'createTime'
  queryParams.isAsc = 'desc'
  await loadList()
}

function handleSelectionChange(rowsOnPage: Array<Record<string, any>>, keys: Array<string | number>) {
  selectedRows.value = rowsOnPage
  selectedRowKeys.value = keys
}

function handleImportSelectionChange(rowsOnPage: Array<Record<string, any>>, keys: Array<string | number>) {
  importSelectedRows.value = rowsOnPage
  importSelectedRowKeys.value = keys
}

function selectedTableNames(row?: Record<string, any>) {
  if (row?.tableName) {
    return [String(row.tableName)]
  }
  return selectedRows.value.map(item => String(item.tableName)).filter(Boolean)
}

async function handleGenerate(row?: Record<string, any>) {
  if (!access.require(toolGenPerms.code, '生成代码')) {
    return
  }

  const tableNames = selectedTableNames(row)
  if (!tableNames.length) {
    toast.warning('请先选择需要生成的表')
    return
  }

  try {
    if (row && String(row.genType) === '1') {
      await genCode(String(row.tableName))
      toast.success(`已按自定义路径生成 ${row.tableName}`)
      return
    }

    const blob = await batchGenCode(tableNames.join(','))
    saveBlob(blob, tableNames.length > 1 ? 'ruoyi.zip' : `${tableNames[0]}.zip`)
    toast.success('代码压缩包已开始下载')
  }
  catch (error) {
    toast.error('代码生成失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function handlePreview(row: Record<string, any>) {
  if (!access.require(toolGenPerms.preview, '预览代码生成结果')) {
    return
  }

  previewLoading.value = true
  try {
    const response = await previewTable(row.tableId)
    previewData.value = response.data ?? {}
    activePreviewPath.value = Object.keys(previewData.value)[0] ?? ''
    previewOpen.value = true
  }
  catch (error) {
    toast.error('代码预览加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    previewLoading.value = false
  }
}

async function copyPreviewContent() {
  if (!activePreviewContent.value) {
    toast.warning('当前没有可复制的代码')
    return
  }

  try {
    await navigator.clipboard.writeText(activePreviewContent.value)
    toast.success('代码已复制到剪贴板')
  }
  catch (error) {
    toast.error('复制失败', { description: error instanceof Error ? error.message : '请手动复制。' })
  }
}

function handleEdit(row?: Record<string, any>) {
  if (!access.require(toolGenPerms.edit, '修改生成配置')) {
    return
  }

  const target = row ?? selectedRows.value[0]
  if (!target?.tableId) {
    toast.warning('请选择一条需要编辑的记录')
    return
  }

  router.push({
    path: `/tool/gen-edit/index/${target.tableId}`,
    query: {
      pageNum: String(queryParams.pageNum),
      t: String(Date.now()),
    },
  })
}

async function handleDelete(row?: Record<string, any>) {
  if (!access.require(toolGenPerms.remove, '删除生成配置')) {
    return
  }

  const ids = row?.tableId ? [row.tableId] : selectedRows.value.map(item => item.tableId)
  if (!ids.length) {
    toast.warning('请先选择需要删除的表')
    return
  }

  try {
    await delTable(ids.join(','))
    toast.success('生成配置删除成功')
    await loadList()
  }
  catch (error) {
    toast.error('生成配置删除失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function handleSynch(row: Record<string, any>) {
  if (!access.require(toolGenPerms.edit, '同步表结构')) {
    return
  }

  try {
    await synchDb(String(row.tableName))
    toast.success(`已同步表 ${row.tableName}`)
    await loadList()
  }
  catch (error) {
    toast.error('同步表结构失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
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

async function openImportDialog() {
  if (!access.require(toolGenPerms.import, '导入代码生成表')) {
    return
  }

  importOpen.value = true
  importQuery.pageNum = 1
  importQuery.pageSize = 10
  importQuery.tableName = ''
  importQuery.tableComment = ''
  importQuery.tplWebType = 'element-plus'
  await loadDbTables()
}

async function handleImportQuery() {
  importQuery.pageNum = 1
  await loadDbTables()
}

async function handleImportReset() {
  importQuery.pageNum = 1
  importQuery.pageSize = 10
  importQuery.tableName = ''
  importQuery.tableComment = ''
  importQuery.tplWebType = 'element-plus'
  await loadDbTables()
}

async function changeImportPage(step: number) {
  const nextPage = importQuery.pageNum + step
  if (nextPage < 1) {
    return
  }
  importQuery.pageNum = nextPage
  await loadDbTables()
}

async function changeImportPageSize(value: number) {
  importQuery.pageNum = 1
  importQuery.pageSize = value
  await loadDbTables()
}

async function submitImport() {
  if (!access.require(toolGenPerms.import, '导入代码生成表')) {
    return
  }

  const tableNames = importSelectedRows.value.map(item => String(item.tableName)).filter(Boolean)
  if (!tableNames.length) {
    toast.warning('请先选择需要导入的表')
    return
  }

  try {
    await importGenTable({
      tables: tableNames.join(','),
      tplWebType: importQuery.tplWebType,
    })
    toast.success('数据表导入成功')
    importOpen.value = false
    await loadList()
  }
  catch (error) {
    toast.error('数据表导入失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

function openCreateDialog() {
  if (!ensureCreatePermission()) {
    return
  }

  createForm.sql = ''
  createForm.tplWebType = 'element-plus'
  createOpen.value = true
}

async function submitCreate() {
  if (!ensureCreatePermission()) {
    return
  }
  if (!createForm.sql.trim()) {
    toast.warning('请输入建表 SQL')
    return
  }

  creating.value = true
  try {
    await createTable({
      sql: createForm.sql,
      tplWebType: createForm.tplWebType,
    })
    toast.success('建表语句执行成功')
    createOpen.value = false
    await loadList()
  }
  catch (error) {
    toast.error('建表失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    creating.value = false
  }
}

onMounted(loadList)
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="admin-kicker">系统工具 / 代码生成</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight">代码生成</h1>
    </div>

    <AdminSectionCard title="生成配置列表" content-class="space-y-4">
      <template #headerExtra>
        <Badge variant="outline">已选 {{ selectedRows.length }} 项</Badge>
        <Button v-if="canGenCode" size="sm" :disabled="!hasSelection" @click="handleGenerate()">
          <Download class="size-4" />
          生成代码
        </Button>
        <Button v-if="canCreateGenTable" variant="outline" size="sm" @click="openCreateDialog">
          <Plus class="size-4" />
          建表语句
        </Button>
        <Button v-if="canImportGen" variant="outline" size="sm" @click="openImportDialog">
          <Database class="size-4" />
          导入表
        </Button>
        <Button v-if="canEditGen" variant="outline" size="sm" :disabled="!singleSelection" @click="handleEdit()">
          <Pencil class="size-4" />
          编辑配置
        </Button>
        <Button v-if="canRemoveGen" variant="outline" size="sm" :disabled="!hasSelection" @click="handleDelete()">
          <Trash2 class="size-4" />
          删除
        </Button>
        <Button variant="outline" size="sm" @click="loadList">
          <RefreshCw class="size-4" />
          刷新
        </Button>
      </template>
      <AdminQueryPanel
        embedded
        grid-class="sm:grid-cols-2 xl:grid-cols-4"
        @query="handleQuery"
        @reset="handleResetQuery"
      >
        <AdminFormField label="表名称">
          <Input v-model="queryParams.tableName" placeholder="请输入表名称" />
        </AdminFormField>
        <AdminFormField label="表描述">
          <Input v-model="queryParams.tableComment" placeholder="请输入表描述" />
        </AdminFormField>
        <AdminFormField label="日期范围" field-class="sm:col-span-2">
          <AdminDateRangePicker v-model:start="queryParams.beginDate" v-model:end="queryParams.endDate" />
        </AdminFormField>
      </AdminQueryPanel>
      <AdminDataTable
        :columns="tableColumns"
        :rows="rows"
        row-key="tableId"
        :loading="loading"
        loading-text="正在加载代码生成配置..."
        empty-text="暂无生成配置"
        show-selection
        :selected-row-keys="selectedRowKeys"
        :actions="genRowActions"
        action-header-class="w-[250px] text-right"
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
        <template #cell-tableName="{ value }">
          <span class="font-medium">{{ value }}</span>
        </template>
        <template #cell-tplCategory="{ row }">
          <Badge variant="outline">{{ tplCategoryLabel(row.tplCategory) }}</Badge>
        </template>
      </AdminDataTable>
    </AdminSectionCard>

    <Dialog v-model:open="previewOpen">
      <AdminDialogContent size="5xl">
        <DialogHeader>
          <DialogTitle>代码预览</DialogTitle>
          <DialogDescription>查看生成结果。</DialogDescription>
        </DialogHeader>

        <div class="space-y-4">
          <div class="-mx-1 overflow-x-auto surface-scrollbar pb-1">
            <div class="flex w-max min-w-full gap-2 px-1">
              <Button
                v-for="entry in previewEntries"
                :key="entry.path"
                :variant="entry.path === activePreviewPath ? 'default' : 'outline'"
                class="shrink-0"
                @click="activePreviewPath = entry.path"
              >
                {{ entry.label }}
              </Button>
              <Button variant="outline" class="shrink-0" :disabled="!activePreviewContent" @click="copyPreviewContent">复制当前文件</Button>
            </div>
          </div>

          <div class="rounded-3xl border border-border/60 bg-muted/20 p-4">
            <pre class="min-h-[220px] overflow-x-auto surface-scrollbar whitespace-pre-wrap font-mono text-xs leading-6 text-foreground sm:min-h-[320px]">{{ previewLoading ? '正在加载预览...' : activePreviewContent || '暂无预览内容' }}</pre>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="previewOpen = false">关闭</Button>
        </DialogFooter>
      </AdminDialogContent>
    </Dialog>

    <Dialog v-model:open="importOpen">
      <AdminDialogContent size="5xl">
        <DialogHeader>
          <DialogTitle>导入数据表</DialogTitle>
          <DialogDescription>选择需要导入的数据表。</DialogDescription>
        </DialogHeader>

        <AdminQueryPanel
          grid-class="sm:grid-cols-2 xl:grid-cols-3"
          @query="handleImportQuery"
          @reset="handleImportReset"
        >
          <AdminFormField label="表名称">
            <Input v-model="importQuery.tableName" placeholder="请输入表名称" />
          </AdminFormField>
          <AdminFormField label="表描述">
            <Input v-model="importQuery.tableComment" placeholder="请输入表描述" />
          </AdminFormField>
          <AdminFormField label="模板类型">
            <Select v-model="importQuery.tplWebType">
              <SelectTrigger><SelectValue placeholder="请选择模板类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in tplWebTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
              </SelectContent>
            </Select>
          </AdminFormField>
        </AdminQueryPanel>

        <AdminSectionCard title="数据库表列表">
          <template #headerExtra>
            <Badge variant="outline">已选 {{ importSelectedRows.length }} 项</Badge>
          </template>
          <AdminDataTable
            :columns="dbTableColumns"
            :rows="importRows"
            row-key="tableName"
            :loading="importLoading"
            loading-text="正在加载数据库表..."
            empty-text="暂无可导入的数据表"
            show-selection
            :selected-row-keys="importSelectedRowKeys"
            :show-pagination="true"
            :total="importTotal"
            :page-num="importQuery.pageNum"
            :page-size="importQuery.pageSize"
            @update:selected-row-keys="importSelectedRowKeys = $event"
            @selection-change="handleImportSelectionChange"
            @update:page-size="changeImportPageSize"
            @update:page-num="changeImportPage($event - importQuery.pageNum)"
            @previous="changeImportPage(-1)"
            @next="changeImportPage(1)"
          >
            <template #cell-tableName="{ value }">
              <span class="font-medium">{{ value }}</span>
            </template>
          </AdminDataTable>
        </AdminSectionCard>

        <DialogFooter>
          <Button variant="outline" @click="importOpen = false">取消</Button>
          <Button @click="submitImport">确认导入</Button>
        </DialogFooter>
      </AdminDialogContent>
    </Dialog>

    <Dialog v-model:open="createOpen">
      <AdminDialogContent size="2xl">
        <DialogHeader>
          <DialogTitle>执行建表 SQL</DialogTitle>
          <DialogDescription>粘贴建表语句。</DialogDescription>
        </DialogHeader>

        <div class="grid gap-4">
          <AdminFormField label="模板类型">
            <Select v-model="createForm.tplWebType">
              <SelectTrigger><SelectValue placeholder="请选择模板类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in tplWebTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField label="建表 SQL">
            <Textarea v-model="createForm.sql" class="min-h-52 font-mono text-xs sm:min-h-72" placeholder="请输入建表 SQL，支持多个 CREATE TABLE 语句。" />
          </AdminFormField>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="createOpen = false">取消</Button>
          <Button :disabled="creating" @click="submitCreate">{{ creating ? '执行中...' : '执行建表' }}</Button>
        </DialogFooter>
      </AdminDialogContent>
    </Dialog>
  </div>
</template>












