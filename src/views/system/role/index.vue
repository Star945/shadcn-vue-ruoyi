<script setup lang="ts">
import { Download, Pencil, Plus, RefreshCw, ShieldCheck, Trash2, Users } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import type { AdminTableActionItem, AdminTableColumn } from '@/components/admin/data-table'

import { roleMenuTreeselect, treeselect } from '@/api/system/menu'
import { addRole, changeRoleStatus, dataScope, delRole, deptTreeSelect, exportRole, getRole, listRole, updateRole } from '@/api/system/role'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminFormField from '@/components/admin/AdminFormField.vue'
import AdminQueryPanel from '@/components/admin/AdminQueryPanel.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import AdminTreeList from '@/components/admin/AdminTreeList.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAccess } from '@/lib/access'
import { saveBlob } from '@/lib/download'
import { permissionKeys } from '@/lib/permission-keys'
import { buildTreeFromFlat } from '@/lib/tree'

const router = useRouter()
const access = useAccess()
const rolePerms = permissionKeys.system.role

const roleTableColumns: AdminTableColumn[] = [
  { key: 'roleId', title: '角色编号' },
  { key: 'roleName', title: '角色名称' },
  { key: 'roleKey', title: '权限字符' },
  { key: 'roleSort', title: '显示顺序' },
  { key: 'dataScope', title: '数据范围' },
  { key: 'status', title: '状态', headerClass: 'text-center', cellClass: 'text-center' },
  { key: 'createTime', title: '创建时间' },
]

const loading = ref(false)
const submitting = ref(false)
const rows = ref<any[]>([])
const total = ref(0)
const menuOptions = ref<any[]>([])
const deptOptions = ref<any[]>([])

const formOpen = ref(false)
const dataScopeOpen = ref(false)
const formTitle = ref('新增角色')

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  roleName: '',
  roleKey: '',
  status: 'all',
})

const form = reactive(defaultForm())
const dataScopeForm = reactive(defaultDataScopeForm())

const canAddRole = computed(() => access.can(rolePerms.add))
const canEditRole = computed(() => access.can(rolePerms.edit))
const canRemoveRole = computed(() => access.can(rolePerms.remove))
const canExportRole = computed(() => access.can(rolePerms.export))
const canManageRoleStatus = computed(() => access.can(rolePerms.edit))

const roleRowActions: AdminTableActionItem[] = [
  { label: '修改', icon: Pencil, visible: row => canEditRole.value && !isProtectedRole(row), onClick: row => openEdit(row) },
  { label: '权限', icon: ShieldCheck, visible: row => canEditRole.value && !isProtectedRole(row), onClick: row => openDataScope(row) },
  { label: '用户', icon: Users, visible: row => canEditRole.value && !isProtectedRole(row), onClick: row => goAuthUser(row) },
  { label: '删除', icon: Trash2, tone: 'danger', visible: row => canRemoveRole.value && !isProtectedRole(row), onClick: row => removeRow(row) },
]

function defaultForm() {
  return {
    roleId: '',
    roleName: '',
    roleKey: '',
    roleSort: 1,
    status: '0',
    remark: '',
    menuIds: [] as Array<string | number>,
    menuCheckStrictly: true,
  }
}

function defaultDataScopeForm() {
  return {
    roleId: '',
    roleName: '',
    roleKey: '',
    dataScope: '1',
    deptCheckStrictly: true,
    deptIds: [] as Array<string | number>,
  }
}

function resetFormState() {
  Object.assign(form, defaultForm())
}

function resetDataScopeState() {
  Object.assign(dataScopeForm, defaultDataScopeForm())
}

function buildQuery() {
  return {
    pageNum: queryParams.pageNum,
    pageSize: queryParams.pageSize,
    roleName: queryParams.roleName || undefined,
    roleKey: queryParams.roleKey || undefined,
    status: queryParams.status === 'all' ? undefined : queryParams.status,
  }
}

function isProtectedRole(row: Record<string, any>) {
  return String(row.roleId) === '1'
}

async function loadList() {
  loading.value = true
  try {
    const response = await listRole(buildQuery())
    rows.value = Array.isArray(response.rows) ? response.rows : []
    total.value = Number(response.total ?? 0)
  }
  catch (error) {
    toast.error('角色列表加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    loading.value = false
  }
}

async function loadMenuTree() {
  const response = await treeselect()
  menuOptions.value = buildTreeFromFlat(Array.isArray(response.data) ? response.data : [], {
    getId: node => node.menuId ?? node.id,
    getLabel: node => String(node.menuName ?? node.label ?? '--'),
    getChildren: node => node.children,
    getParentId: node => node.parentId,
  })
}

async function handleQuery() {
  queryParams.pageNum = 1
  await loadList()
}

async function handleResetQuery() {
  queryParams.pageNum = 1
  queryParams.pageSize = 10
  queryParams.roleName = ''
  queryParams.roleKey = ''
  queryParams.status = 'all'
  await loadList()
}

async function handleExport() {
  if (!access.require(rolePerms.export, '导出角色')) {
    return
  }

  try {
    const blob = await exportRole(buildQuery())
    saveBlob(blob, 'role.xlsx')
    toast.success('角色数据导出成功')
  }
  catch (error) {
    toast.error('角色数据导出失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function openCreate() {
  if (!access.require(rolePerms.add, '新增角色')) {
    return
  }

  resetFormState()
  formTitle.value = '新增角色'
  try {
    await loadMenuTree()
    formOpen.value = true
  }
  catch (error) {
    toast.error('角色表单初始化失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function openEdit(row: Record<string, any>) {
  if (isProtectedRole(row)) {
    toast.warning('内置管理员角色不允许在此页面修改')
    return
  }
  if (!access.require(rolePerms.edit, '修改角色')) {
    return
  }

  resetFormState()
  formTitle.value = '修改角色'
  try {
    const [roleResponse, menuResponse] = await Promise.all([
      getRole(row.roleId),
      roleMenuTreeselect(row.roleId),
    ])
    Object.assign(form, defaultForm(), roleResponse.data ?? {}, {
      roleId: roleResponse.data?.roleId ? String(roleResponse.data.roleId) : '',
      roleSort: Number(roleResponse.data?.roleSort ?? 1),
      menuIds: Array.isArray(menuResponse.checkedKeys) ? menuResponse.checkedKeys.map((item: unknown) => String(item)) : [],
      menuCheckStrictly: Boolean(roleResponse.data?.menuCheckStrictly ?? true),
    })
    menuOptions.value = buildTreeFromFlat(Array.isArray(menuResponse.menus) ? menuResponse.menus : Array.isArray(menuResponse.data) ? menuResponse.data : [], {
      getId: node => node.menuId ?? node.id,
      getLabel: node => String(node.menuName ?? node.label ?? '--'),
      getChildren: node => node.children,
      getParentId: node => node.parentId,
    })
    formOpen.value = true
  }
  catch (error) {
    toast.error('角色信息加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

function validateForm() {
  if (!form.roleName.trim()) {
    toast.warning('请输入角色名称')
    return false
  }
  if (!form.roleKey.trim()) {
    toast.warning('请输入权限字符')
    return false
  }
  if (!Number.isFinite(Number(form.roleSort)) || Number(form.roleSort) < 0) {
    toast.warning('显示顺序必须是大于等于 0 的数字')
    return false
  }
  return true
}

async function submitForm() {
  const action = form.roleId ? rolePerms.edit : rolePerms.add
  const actionLabel = form.roleId ? '修改角色' : '新增角色'
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
      roleId: form.roleId || undefined,
      roleSort: Number(form.roleSort ?? 1),
      menuIds: form.menuIds,
    }
    if (form.roleId) {
      await updateRole(payload)
      toast.success('角色修改成功')
    }
    else {
      await addRole(payload)
      toast.success('角色新增成功')
    }
    formOpen.value = false
    await loadList()
  }
  catch (error) {
    toast.error(form.roleId ? '角色修改失败' : '角色新增失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    submitting.value = false
  }
}

async function removeRow(row: Record<string, any>) {
  if (isProtectedRole(row)) {
    toast.warning('内置管理员角色不允许在此页面删除')
    return
  }
  if (!access.require(rolePerms.remove, '删除角色')) {
    return
  }

  try {
    await delRole(row.roleId)
    toast.success('角色删除成功')
    await loadList()
  }
  catch (error) {
    toast.error('角色删除失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function toggleStatus(row: Record<string, any>, value: boolean) {
  if (!access.require(rolePerms.edit, `${value ? '启用' : '停用'}角色`)) {
    return
  }
  const targetStatus = value ? '0' : '1'
  try {
    await changeRoleStatus(row.roleId, targetStatus)
    row.status = targetStatus
    toast.success(`${value ? '启用' : '停用'}角色 ${row.roleName}`)
  }
  catch (error) {
    toast.error('状态更新失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

function updateMenuTreeSelection(value: string[]) {
  form.menuIds.splice(0, form.menuIds.length, ...value)
}

function updateDeptTreeSelection(value: string[]) {
  dataScopeForm.deptIds.splice(0, dataScopeForm.deptIds.length, ...value)
}

function dataScopeText(value: string) {
  if (value === '1') return '全部数据权限'
  if (value === '2') return '自定数据权限'
  if (value === '3') return '本部门数据权限'
  if (value === '4') return '本部门及以下数据权限'
  if (value === '5') return '仅本人数据权限'
  return '未设置'
}

async function openDataScope(row: Record<string, any>) {
  if (isProtectedRole(row)) {
    toast.warning('内置管理员角色不允许在此页面分配数据权限')
    return
  }
  if (!access.require(rolePerms.edit, '分配角色数据权限')) {
    return
  }

  resetDataScopeState()
  try {
    const [roleResponse, deptResponse] = await Promise.all([
      getRole(row.roleId),
      deptTreeSelect(row.roleId),
    ])
    Object.assign(dataScopeForm, defaultDataScopeForm(), roleResponse.data ?? {}, {
      roleId: roleResponse.data?.roleId ? String(roleResponse.data.roleId) : '',
      dataScope: String(roleResponse.data?.dataScope ?? '1'),
      deptCheckStrictly: Boolean(roleResponse.data?.deptCheckStrictly ?? true),
      deptIds: Array.isArray(deptResponse.checkedKeys) ? deptResponse.checkedKeys.map((item: unknown) => String(item)) : [],
    })
    deptOptions.value = buildTreeFromFlat(Array.isArray(deptResponse.depts) ? deptResponse.depts : Array.isArray(deptResponse.data) ? deptResponse.data : [], {
      getId: node => node.deptId ?? node.id,
      getLabel: node => String(node.deptName ?? node.label ?? '--'),
      getChildren: node => node.children,
      getParentId: node => node.parentId,
    })
    dataScopeOpen.value = true
  }
  catch (error) {
    toast.error('数据权限加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function submitDataScope() {
  if (!access.require(rolePerms.edit, '提交角色数据权限')) {
    return
  }
  try {
    await dataScope({
      ...dataScopeForm,
      roleId: dataScopeForm.roleId,
      deptIds: dataScopeForm.dataScope === '2' ? dataScopeForm.deptIds : [],
    })
    toast.success('数据权限修改成功')
    dataScopeOpen.value = false
    await loadList()
  }
  catch (error) {
    toast.error('数据权限修改失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

function goAuthUser(row: Record<string, any>) {
  if (isProtectedRole(row)) {
    toast.warning('内置管理员角色不允许在此页面分配用户')
    return
  }
  if (!access.require(rolePerms.edit, '分配角色用户')) {
    return
  }
  router.push(`/system/role-auth/user/${row.roleId}`)
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

function statusText(status: string) {
  return status === '0' ? '正常' : '停用'
}

onMounted(loadList)
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="admin-kicker">系统管理 / 角色管理</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight">角色管理</h1>
    </div>

    <AdminSectionCard title="角色列表" content-class="space-y-4">
      <template #headerExtra>
        <Button v-if="canAddRole" size="sm" @click="openCreate">
          <Plus class="size-4" />
          新增角色
        </Button>
        <Button v-if="canExportRole" variant="outline" size="sm" @click="handleExport">
          <Download class="size-4" />
          导出角色
        </Button>
        <Button variant="outline" size="sm" @click="loadList">
          <RefreshCw class="size-4" />
          刷新
        </Button>
      </template>

      <AdminQueryPanel embedded @query="handleQuery" @reset="handleResetQuery">
        <AdminFormField label="角色名称">
          <Input v-model="queryParams.roleName" placeholder="请输入角色名称" />
        </AdminFormField>
        <AdminFormField label="权限字符">
          <Input v-model="queryParams.roleKey" placeholder="请输入权限字符" />
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
        :columns="roleTableColumns"
        :rows="rows"
        row-key="roleId"
        :loading="loading"
        loading-text="正在加载角色数据..."
        empty-text="暂无数据"
        :actions="roleRowActions"
        action-header-class="w-[250px] text-right"
        :show-pagination="true"
        :total="total"
        :page-num="queryParams.pageNum"
        :page-size="queryParams.pageSize"
        @update:page-size="changePageSize"
        @update:page-num="changePage($event - queryParams.pageNum)"
        @previous="changePage(-1)"
        @next="changePage(1)"
      >
        <template #cell-roleName="{ value }">
          <span class="font-medium">{{ value }}</span>
        </template>
        <template #cell-dataScope="{ row }">
          <Badge variant="outline">{{ dataScopeText(String(row.dataScope ?? '')) }}</Badge>
        </template>
        <template #cell-status="{ row }">
          <div class="flex items-center justify-center gap-2">
            <Switch v-if="canManageRoleStatus" :model-value="String(row.status) === '0'" @update:model-value="value => toggleStatus(row, Boolean(value))" />
            <Badge variant="outline">{{ statusText(String(row.status)) }}</Badge>
          </div>
        </template>
      </AdminDataTable>
    </AdminSectionCard>

    <Dialog v-model:open="formOpen">
      <DialogContent class="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>{{ formTitle }}</DialogTitle>
          <DialogDescription>{{ form.roleId ? '调整角色信息与菜单权限。' : '创建新的角色并配置菜单权限。' }}</DialogDescription>
        </DialogHeader>

        <div class="grid gap-4 md:grid-cols-2">
          <AdminFormField label="角色名称">
            <Input v-model="form.roleName" placeholder="请输入角色名称" />
          </AdminFormField>
          <AdminFormField label="权限字符">
            <Input v-model="form.roleKey" placeholder="请输入权限字符" />
          </AdminFormField>
          <AdminFormField label="显示顺序">
            <Input v-model="form.roleSort" type="number" min="0" />
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
          <AdminFormField label="菜单权限" field-class="md:col-span-2">
            <div class="space-y-2 rounded-3xl border border-border/70 bg-muted/25 p-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span class="text-sm text-muted-foreground">角色可访问菜单</span>
                <label class="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox :checked="form.menuCheckStrictly" @update:checked="(checked: boolean | 'indeterminate') => form.menuCheckStrictly = Boolean(checked)" />
                  关闭父子联动
                </label>
              </div>
              <AdminTreeList
                :nodes="menuOptions"
                selection-mode="multiple"
                :selected-keys="form.menuIds"
                default-expand-all
                empty-text="暂无菜单权限数据"
                @update:selected-keys="updateMenuTreeSelection"
              />
            </div>
          </AdminFormField>
          <AdminFormField label="备注" field-class="md:col-span-2">
            <Textarea v-model="form.remark" class="min-h-28" placeholder="请输入备注" />
          </AdminFormField>
        </div>

        <DialogFooter>
          <Button variant="outline" class="w-full sm:w-auto" @click="formOpen = false">取消</Button>
          <Button class="w-full sm:w-auto" :disabled="submitting" @click="submitForm">{{ submitting ? '提交中...' : '提交' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="dataScopeOpen">
      <DialogContent class="sm:max-w-[820px]">
        <DialogHeader>
          <DialogTitle>分配数据权限</DialogTitle>
          <DialogDescription>按数据范围调整可访问部门。</DialogDescription>
        </DialogHeader>

        <div class="grid gap-4 md:grid-cols-2">
          <AdminFormField label="角色名称">
            <Input :model-value="dataScopeForm.roleName" disabled />
          </AdminFormField>
          <AdminFormField label="权限字符">
            <Input :model-value="dataScopeForm.roleKey" disabled />
          </AdminFormField>
          <AdminFormField label="数据范围" field-class="md:col-span-2">
            <Select v-model="dataScopeForm.dataScope">
              <SelectTrigger><SelectValue placeholder="请选择数据范围" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">全部数据权限</SelectItem>
                <SelectItem value="2">自定数据权限</SelectItem>
                <SelectItem value="3">本部门数据权限</SelectItem>
                <SelectItem value="4">本部门及以下数据权限</SelectItem>
                <SelectItem value="5">仅本人数据权限</SelectItem>
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField v-if="dataScopeForm.dataScope === '2'" label="部门权限" field-class="md:col-span-2">
            <div class="space-y-2 rounded-3xl border border-border/70 bg-muted/25 p-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span class="text-sm text-muted-foreground">可访问部门树</span>
                <label class="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox :checked="dataScopeForm.deptCheckStrictly" @update:checked="(checked: boolean | 'indeterminate') => dataScopeForm.deptCheckStrictly = Boolean(checked)" />
                  关闭父子联动
                </label>
              </div>
              <AdminTreeList
                :nodes="deptOptions"
                selection-mode="multiple"
                :selected-keys="dataScopeForm.deptIds"
                default-expand-all
                empty-text="暂无部门权限数据"
                @update:selected-keys="updateDeptTreeSelection"
              />
            </div>
          </AdminFormField>
        </div>

        <DialogFooter>
          <Button variant="outline" class="w-full sm:w-auto" @click="dataScopeOpen = false">取消</Button>
          <Button class="w-full sm:w-auto" @click="submitDataScope">提交</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
