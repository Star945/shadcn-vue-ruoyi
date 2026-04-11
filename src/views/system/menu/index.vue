<script setup lang="ts">
import { ChevronDown, ChevronRight, FolderPlus, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'

import type { AdminTableActionItem, AdminTableColumn } from '@/components/admin/data-table'

import { addMenu, delMenu, getMenu, listMenu, treeselect, updateMenu } from '@/api/system/menu'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminFormField from '@/components/admin/AdminFormField.vue'
import AdminQueryPanel from '@/components/admin/AdminQueryPanel.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAccess } from '@/lib/access'
import { permissionKeys } from '@/lib/permission-keys'
import { buildTreeFromFlat, collectTreeBranchIds, flattenTree, flattenVisibleTree } from '@/lib/tree'

const access = useAccess()
const menuPerms = permissionKeys.system.menu

const menuTableColumns: AdminTableColumn[] = [
  { key: 'menuName', title: '菜单名称' },
  { key: 'menuType', title: '类型' },
  { key: 'orderNum', title: '排序' },
  { key: 'perms', title: '权限标识' },
  { key: 'component', title: '组件路径' },
  { key: 'visible', title: '可见性' },
  { key: 'status', title: '状态' },
]

const treeResolver = {
  getId: (node: Record<string, any>) => node.menuId,
  getLabel: (node: Record<string, any>) => String(node.menuName ?? '--'),
  getChildren: (node: Record<string, any>) => node.children,
}

const loading = ref(false)
const rows = ref<any[]>([])
const treeOptions = ref<any[]>([])
const expandedRowKeys = ref<string[]>([])
const treeInitialized = ref(false)
const formOpen = ref(false)
const submitting = ref(false)
const formTitle = ref('新增菜单')

const queryParams = reactive({
  menuName: '',
  status: 'all',
})

const form = reactive(defaultForm())

const canAddMenu = computed(() => access.can(menuPerms.add))
const canEditMenu = computed(() => access.can(menuPerms.edit))
const canRemoveMenu = computed(() => access.can(menuPerms.remove))

const menuRowActions: AdminTableActionItem[] = [
  { label: '下级', icon: FolderPlus, tone: 'muted', visible: () => canAddMenu.value, onClick: row => openCreate(String(row.raw.menuId)) },
  { label: '编辑', icon: Pencil, tone: 'muted', visible: () => canEditMenu.value, onClick: row => openEdit(row.raw) },
  { label: '删除', icon: Trash2, tone: 'danger', visible: () => canRemoveMenu.value, onClick: row => removeRow(row.raw) },
]

const branchRowKeys = computed(() => collectTreeBranchIds(rows.value, treeResolver))
const expandedRowKeySet = computed(() => new Set(expandedRowKeys.value))
const allExpanded = computed(() => branchRowKeys.value.length > 0 && branchRowKeys.value.every(id => expandedRowKeySet.value.has(id)))
const visibleRows = computed(() => flattenVisibleTree(rows.value, treeResolver, expandedRowKeys.value))

const flatTreeOptions = computed(() => flattenTree(treeOptions.value, {
  getId: node => node.id ?? node.menuId,
  getLabel: node => String(node.label ?? node.menuName ?? '--'),
  getChildren: node => node.children,
}))

function defaultForm() {
  return {
    menuId: '',
    parentId: '0',
    menuType: 'C',
    menuName: '',
    icon: '',
    orderNum: 1,
    path: '',
    component: '',
    perms: '',
    status: '0',
    visible: '0',
    remark: '',
    query: '',
    routeName: '',
    isFrame: '1',
    isCache: '0',
  }
}

function resetFormState() {
  Object.assign(form, defaultForm())
}

function syncExpandedRows(defaultExpandAll = false) {
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

function menuTypeText(value: string) {
  if (value === 'M') return '目录'
  if (value === 'F') return '按钮'
  return '菜单'
}

function statusText(value: string) {
  return value === '0' ? '正常' : '停用'
}

function visibleText(value: string) {
  return value === '0' ? '显示' : '隐藏'
}

async function loadParentTree() {
  const response = await treeselect()
  treeOptions.value = buildTreeFromFlat(Array.isArray(response.data) ? response.data : [], {
    getId: node => node.menuId ?? node.id,
    getLabel: node => String(node.menuName ?? node.label ?? '--'),
    getChildren: node => node.children,
    getParentId: node => node.parentId,
  })
}

async function loadList() {
  loading.value = true
  try {
    const response = await listMenu({
      menuName: queryParams.menuName || undefined,
      status: queryParams.status === 'all' ? undefined : queryParams.status,
    })
    rows.value = buildTreeFromFlat(Array.isArray(response.data) ? response.data : [], {
      getId: node => node.menuId,
      getLabel: node => String(node.menuName ?? '--'),
      getChildren: node => node.children,
      getParentId: node => node.parentId,
    })
    syncExpandedRows(false)
  }
  catch (error) {
    toast.error('菜单列表加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    loading.value = false
  }
}

async function handleQuery() {
  await loadList()
}

async function handleResetQuery() {
  queryParams.menuName = ''
  queryParams.status = 'all'
  await loadList()
}

async function openCreate(parentId = '0') {
  if (!access.require(menuPerms.add, parentId === '0' ? '新增菜单' : '新增下级菜单')) {
    return
  }

  resetFormState()
  form.parentId = parentId
  formTitle.value = parentId === '0' ? '新增菜单' : '新增下级菜单'
  try {
    await loadParentTree()
    formOpen.value = true
  }
  catch (error) {
    toast.error('菜单表单初始化失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function openEdit(row: Record<string, any>) {
  if (!access.require(menuPerms.edit, '修改菜单')) {
    return
  }

  resetFormState()
  formTitle.value = '修改菜单'
  try {
    const [menuResponse] = await Promise.all([
      getMenu(row.menuId),
      loadParentTree(),
    ])
    Object.assign(form, defaultForm(), menuResponse.data ?? {}, {
      menuId: menuResponse.data?.menuId ? String(menuResponse.data.menuId) : '',
      parentId: menuResponse.data?.parentId ? String(menuResponse.data.parentId) : '0',
      orderNum: Number(menuResponse.data?.orderNum ?? 1),
      menuType: String(menuResponse.data?.menuType ?? 'C'),
      status: String(menuResponse.data?.status ?? '0'),
      visible: String(menuResponse.data?.visible ?? '0'),
    })
    formOpen.value = true
  }
  catch (error) {
    toast.error('菜单信息加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

function validateForm() {
  if (!String(form.menuName).trim()) {
    toast.warning('请输入菜单名称')
    return false
  }
  if (form.menuType !== 'F' && !String(form.path).trim()) {
    toast.warning('目录或菜单必须填写路由地址')
    return false
  }
  if (form.menuType === 'C' && !String(form.component).trim()) {
    toast.warning('菜单类型必须填写组件路径')
    return false
  }
  if (form.menuType === 'F' && !String(form.perms).trim()) {
    toast.warning('按钮类型必须填写权限标识')
    return false
  }
  return true
}

async function submitForm() {
  const action = form.menuId ? menuPerms.edit : menuPerms.add
  const actionLabel = form.menuId ? '修改菜单' : '新增菜单'
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
      menuId: form.menuId || undefined,
      parentId: form.parentId || '0',
      orderNum: Number(form.orderNum ?? 1),
    }
    if (form.menuId) {
      await updateMenu(payload)
      toast.success('菜单修改成功')
    }
    else {
      await addMenu(payload)
      toast.success('菜单新增成功')
    }
    formOpen.value = false
    await Promise.all([loadParentTree(), loadList()])
  }
  catch (error) {
    toast.error(form.menuId ? '菜单修改失败' : '菜单新增失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    submitting.value = false
  }
}

async function removeRow(row: Record<string, any>) {
  if (!access.require(menuPerms.remove, '删除菜单')) {
    return
  }

  try {
    await delMenu(row.menuId)
    toast.success('菜单删除成功')
    await Promise.all([loadParentTree(), loadList()])
  }
  catch (error) {
    toast.error('菜单删除失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

onMounted(async () => {
  await Promise.all([loadParentTree(), loadList()])
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="admin-kicker">系统管理 / 菜单管理</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight">菜单管理</h1>
    </div>

    <AdminSectionCard title="菜单树" content-class="space-y-4">
      <template #headerExtra>
        <Button v-if="canAddMenu" size="sm" @click="openCreate()">
          <Plus class="size-4" />
          新增菜单
        </Button>
        <Button variant="outline" size="sm" @click="toggleExpandAll">
          <ChevronDown class="size-4" />
          {{ allExpanded ? '收起' : '展开' }}
        </Button>
        <Button variant="outline" size="sm" @click="loadList">
          <RefreshCw class="size-4" />
          刷新
        </Button>
      </template>

      <AdminQueryPanel embedded grid-class="md:grid-cols-2 xl:grid-cols-3" @query="handleQuery" @reset="handleResetQuery">
        <AdminFormField label="菜单名称">
          <Input v-model="queryParams.menuName" placeholder="请输入菜单名称" />
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
        :columns="menuTableColumns"
        :rows="visibleRows"
        row-key="id"
        :loading="loading"
        loading-text="正在加载菜单数据..."
        empty-text="暂无数据"
        :actions="menuRowActions"
        action-header-class="w-[170px] text-right"
      >
        <template #cell-menuName="{ row }">
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
            <span class="font-medium">{{ row.raw.menuName }}</span>
          </div>
        </template>
        <template #cell-menuType="{ row }">
          <Badge variant="outline">{{ menuTypeText(String(row.raw.menuType)) }}</Badge>
        </template>
        <template #cell-visible="{ row }">
          <AdminStatusBadge :label="visibleText(String(row.raw.visible ?? '0'))" />
        </template>
        <template #cell-status="{ row }">
          <AdminStatusBadge :label="statusText(String(row.raw.status ?? '0'))" />
        </template>
      </AdminDataTable>
    </AdminSectionCard>

    <Dialog v-model:open="formOpen">
      <DialogContent class="sm:max-w-[860px]">
        <DialogHeader>
          <DialogTitle>{{ formTitle }}</DialogTitle>
          <DialogDescription>{{ form.menuId ? '调整菜单信息与路由配置。' : '创建新的菜单节点。' }}</DialogDescription>
        </DialogHeader>

        <div class="grid gap-4 md:grid-cols-2">
          <AdminFormField label="上级菜单">
            <Select v-model="form.parentId">
              <SelectTrigger><SelectValue placeholder="请选择上级菜单" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">主类目</SelectItem>
                <SelectItem v-for="node in flatTreeOptions" :key="node.id" :value="node.id">{{ '　'.repeat(node.depth) }}{{ node.label }}</SelectItem>
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField label="菜单类型">
            <Select v-model="form.menuType">
              <SelectTrigger><SelectValue placeholder="请选择菜单类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M">目录</SelectItem>
                <SelectItem value="C">菜单</SelectItem>
                <SelectItem value="F">按钮</SelectItem>
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField label="菜单名称">
            <Input v-model="form.menuName" placeholder="请输入菜单名称" />
          </AdminFormField>
          <AdminFormField label="显示排序">
            <Input v-model="form.orderNum" type="number" min="0" />
          </AdminFormField>
          <AdminFormField label="路由地址">
            <Input v-model="form.path" placeholder="请输入路由地址" />
          </AdminFormField>
          <AdminFormField label="组件路径">
            <Input v-model="form.component" placeholder="请输入组件路径" />
          </AdminFormField>
          <AdminFormField label="权限标识">
            <Input v-model="form.perms" placeholder="请输入权限标识" />
          </AdminFormField>
          <AdminFormField label="图标">
            <Input v-model="form.icon" placeholder="请输入图标名称" />
          </AdminFormField>
          <AdminFormField label="显示状态">
            <Select v-model="form.visible">
              <SelectTrigger><SelectValue placeholder="请选择显示状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">显示</SelectItem>
                <SelectItem value="1">隐藏</SelectItem>
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField label="菜单状态">
            <Select v-model="form.status">
              <SelectTrigger><SelectValue placeholder="请选择菜单状态" /></SelectTrigger>
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
