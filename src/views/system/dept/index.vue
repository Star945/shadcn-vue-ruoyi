<script setup lang="ts">
import { ChevronDown, ChevronRight, FolderPlus, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'

import type { AdminTableActionItem, AdminTableColumn } from '@/components/admin/data-table'

import { addDept, delDept, getDept, listDept, listDeptExcludeChild, updateDept } from '@/api/system/dept'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminFormField from '@/components/admin/AdminFormField.vue'
import AdminQueryPanel from '@/components/admin/AdminQueryPanel.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { buildTreeFromFlat, collectTreeBranchIds, flattenTree, flattenVisibleTree } from '@/lib/tree'
import { useAccess } from '@/lib/access'
import { permissionKeys } from '@/lib/permission-keys'

const access = useAccess()
const deptPerms = permissionKeys.system.dept

const deptTableColumns: AdminTableColumn[] = [
  { key: 'deptName', title: '部门名称' },
  { key: 'orderNum', title: '排序' },
  { key: 'leader', title: '负责人' },
  { key: 'phone', title: '联系电话' },
  { key: 'email', title: '邮箱' },
  { key: 'status', title: '状态' },
  { key: 'createTime', title: '创建时间' },
]

const treeResolver = {
  getId: (node: Record<string, any>) => node.deptId,
  getLabel: (node: Record<string, any>) => String(node.deptName ?? '--'),
  getChildren: (node: Record<string, any>) => node.children,
}

const loading = ref(false)
const rows = ref<any[]>([])
const treeOptions = ref<any[]>([])
const expandedRowKeys = ref<string[]>([])
const treeInitialized = ref(false)
const formOpen = ref(false)
const submitting = ref(false)
const formTitle = ref('新增部门')

const queryParams = reactive({
  deptName: '',
  status: 'all',
})

const form = reactive(defaultForm())

const canAddDept = computed(() => access.can(deptPerms.add))
const canEditDept = computed(() => access.can(deptPerms.edit))
const canRemoveDept = computed(() => access.can(deptPerms.remove))
const deptRowActions: AdminTableActionItem[] = [
  { label: '下级', icon: FolderPlus, tone: 'muted', visible: () => canAddDept.value, onClick: (row) => openCreate(String(row.raw.deptId)) },
  { label: '编辑', icon: Pencil, tone: 'muted', visible: () => canEditDept.value, onClick: (row) => openEdit(row.raw) },
  { label: '删除', icon: Trash2, tone: 'danger', visible: () => canRemoveDept.value, onClick: (row) => removeRow(row.raw) },
]

const branchRowKeys = computed(() => collectTreeBranchIds(rows.value, treeResolver))
const expandedRowKeySet = computed(() => new Set(expandedRowKeys.value))
const allExpanded = computed(() => branchRowKeys.value.length > 0 && branchRowKeys.value.every(id => expandedRowKeySet.value.has(id)))
const visibleRows = computed(() => flattenVisibleTree(rows.value, treeResolver, expandedRowKeys.value))

const flatTreeOptions = computed(() => flattenTree(treeOptions.value, {
  getId: node => node.id ?? node.deptId,
  getLabel: node => String(node.label ?? node.deptName ?? '--'),
  getChildren: node => node.children,
}))

function defaultForm() {
  return {
    deptId: '',
    parentId: '0',
    deptName: '',
    orderNum: 0,
    leader: '',
    phone: '',
    email: '',
    status: '0',
  }
}

function resetFormState() {
  Object.assign(form, defaultForm())
}

function syncExpandedRows(defaultExpandAll = true) {
  const nextBranchKeys = branchRowKeys.value
  if (!treeInitialized.value) {
    expandedRowKeys.value = defaultExpandAll ? [...nextBranchKeys] : []
    treeInitialized.value = true
    return
  }

  const branchSet = new Set(nextBranchKeys)
  expandedRowKeys.value = expandedRowKeys.value.filter(id => branchSet.has(id))
}

function toggleExpandAll() {
  expandedRowKeys.value = allExpanded.value ? [] : [...branchRowKeys.value]
}

function toggleRowExpansion(rowId: string) {
  expandedRowKeys.value = expandedRowKeySet.value.has(rowId)
    ? expandedRowKeys.value.filter(id => id !== rowId)
    : [...expandedRowKeys.value, rowId]
}

function statusText(value: string) {
  return value === '0' ? '正常' : '停用'
}

async function loadParentTree(excludeDeptId?: string) {
  const response = excludeDeptId ? await listDeptExcludeChild(excludeDeptId) : await listDept()
  treeOptions.value = buildTreeFromFlat(Array.isArray(response.data) ? response.data : [], {
    getId: node => node.deptId ?? node.id,
    getLabel: node => String(node.deptName ?? node.label ?? '--'),
    getChildren: node => node.children,
    getParentId: node => node.parentId,
  })
}

async function loadList() {
  loading.value = true
  try {
    const response = await listDept({
      deptName: queryParams.deptName || undefined,
      status: queryParams.status === 'all' ? undefined : queryParams.status,
    })
    rows.value = buildTreeFromFlat(Array.isArray(response.data) ? response.data : [], {
      getId: node => node.deptId,
      getLabel: node => String(node.deptName ?? '--'),
      getChildren: node => node.children,
      getParentId: node => node.parentId,
    })
    syncExpandedRows(true)
  }
  catch (error) {
    toast.error('部门列表加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    loading.value = false
  }
}

async function handleQuery() {
  await loadList()
}

async function handleResetQuery() {
  queryParams.deptName = ''
  queryParams.status = 'all'
  await loadList()
}

async function openCreate(parentId = '0') {
  if (!access.require(deptPerms.add, parentId === '0' ? '新增部门' : '新增下级部门')) {
    return
  }

  resetFormState()
  form.parentId = parentId
  formTitle.value = parentId === '0' ? '新增部门' : '新增下级部门'
  try {
    await loadParentTree()
    formOpen.value = true
  }
  catch (error) {
    toast.error('部门表单初始化失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function openEdit(row: Record<string, any>) {
  if (!access.require(deptPerms.edit, '修改部门')) {
    return
  }

  resetFormState()
  formTitle.value = '修改部门'
  try {
    const [deptResponse] = await Promise.all([
      getDept(row.deptId),
      loadParentTree(String(row.deptId)),
    ])
    Object.assign(form, defaultForm(), deptResponse.data ?? {}, {
      deptId: deptResponse.data?.deptId ? String(deptResponse.data.deptId) : '',
      parentId: deptResponse.data?.parentId ? String(deptResponse.data.parentId) : '0',
      orderNum: Number(deptResponse.data?.orderNum ?? 0),
      status: String(deptResponse.data?.status ?? '0'),
    })
    formOpen.value = true
  }
  catch (error) {
    toast.error('部门信息加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

function validateForm() {
  if (!String(form.deptName).trim()) {
    toast.warning('请输入部门名称')
    return false
  }
  if (!Number.isFinite(Number(form.orderNum)) || Number(form.orderNum) < 0) {
    toast.warning('显示排序必须是大于等于 0 的数字')
    return false
  }
  return true
}

async function submitForm() {
  const action = form.deptId ? deptPerms.edit : deptPerms.add
  const actionLabel = form.deptId ? '修改部门' : '新增部门'
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
      deptId: form.deptId || undefined,
      parentId: form.parentId || '0',
      orderNum: Number(form.orderNum ?? 0),
    }
    if (form.deptId) {
      await updateDept(payload)
      toast.success('部门修改成功')
    }
    else {
      await addDept(payload)
      toast.success('部门新增成功')
    }
    formOpen.value = false
    await Promise.all([loadParentTree(), loadList()])
  }
  catch (error) {
    toast.error(form.deptId ? '部门修改失败' : '部门新增失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    submitting.value = false
  }
}

async function removeRow(row: Record<string, any>) {
  if (!access.require(deptPerms.remove, '删除部门')) {
    return
  }

  try {
    await delDept(row.deptId)
    toast.success('部门删除成功')
    await Promise.all([loadParentTree(), loadList()])
  }
  catch (error) {
    toast.error('部门删除失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

onMounted(async () => {
  await Promise.all([loadParentTree(), loadList()])
})
</script>

<template>
  <div class="space-y-6">
    <div>
        <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">系统管理 / 部门管理</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight">部门管理</h1>
      </div>

    <AdminQueryPanel grid-class="md:grid-cols-2 xl:grid-cols-3" @query="handleQuery" @reset="handleResetQuery">
      <AdminFormField label="部门名称">
        <Input v-model="queryParams.deptName" placeholder="请输入部门名称" />
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

    <AdminSectionCard title="部门树">
      <template #headerExtra>
        <Button v-if="canAddDept" size="sm" @click="openCreate()">
          <Plus class="size-4" />
          新增部门
        </Button>
        <Button variant="outline" size="sm" @click="toggleExpandAll">
          <ChevronDown class="size-4" />
          {{ allExpanded ? '收起全部' : '展开全部' }}
        </Button>
        <Button variant="outline" size="sm" @click="loadList">
          <RefreshCw class="size-4" />
          刷新
        </Button>
      </template>
      <AdminDataTable
        :columns="deptTableColumns"
        :rows="visibleRows"
        row-key="id"
        :loading="loading"
        loading-text="正在加载部门数据..."
        empty-text="暂无数据"
        :actions="deptRowActions"
        action-header-class="w-[170px] text-right"
      >
        <template #cell-deptName="{ row }">
          <div class="flex items-center gap-2" :style="{ paddingInlineStart: `${row.depth * 14}px` }">
            <button
              v-if="row.hasChildren"
              type="button"
              class="inline-flex size-7 items-center justify-center rounded-[var(--button-radius)] text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
              @click.stop="toggleRowExpansion(row.id)"
            >
              <ChevronDown v-if="row.expanded" class="size-4" />
              <ChevronRight v-else class="size-4" />
            </button>
            <span v-else class="inline-flex size-7" />
            <span class="inline-flex size-2 rounded-full bg-primary/50" />
            <span class="font-medium">{{ row.raw.deptName }}</span>
          </div>
        </template>
        <template #cell-status="{ row }">
          <Badge variant="outline">{{ statusText(String(row.raw.status ?? '0')) }}</Badge>
        </template>
      </AdminDataTable>
    </AdminSectionCard>

    <Dialog v-model:open="formOpen">
      <DialogContent class="sm:max-w-[860px]">
        <DialogHeader>
          <DialogTitle>{{ formTitle }}</DialogTitle>
          <DialogDescription>{{ form.deptId ? '修改部门资料。' : '填写部门信息。' }}</DialogDescription>
        </DialogHeader>

        <div class="grid gap-4 md:grid-cols-2">
          <AdminFormField label="上级部门">
            <Select v-model="form.parentId">
              <SelectTrigger><SelectValue placeholder="请选择上级部门" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">顶级部门</SelectItem>
                <SelectItem v-for="node in flatTreeOptions" :key="node.id" :value="node.id">{{ '　'.repeat(node.depth) }}{{ node.label }}</SelectItem>
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField label="部门名称">
            <Input v-model="form.deptName" placeholder="请输入部门名称" />
          </AdminFormField>
          <AdminFormField label="显示排序">
            <Input v-model="form.orderNum" type="number" min="0" />
          </AdminFormField>
          <AdminFormField label="负责人">
            <Input v-model="form.leader" placeholder="请输入负责人" />
          </AdminFormField>
          <AdminFormField label="联系电话">
            <Input v-model="form.phone" placeholder="请输入联系电话" />
          </AdminFormField>
          <AdminFormField label="邮箱">
            <Input v-model="form.email" placeholder="请输入邮箱" />
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
        </div>

        <DialogFooter>
          <Button variant="outline" @click="formOpen = false">取消</Button>
          <Button :disabled="submitting" @click="submitForm">{{ submitting ? '提交中...' : '提交' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>











