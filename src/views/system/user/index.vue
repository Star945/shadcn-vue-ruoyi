<script setup lang="ts">
import { ChevronDown, ChevronUp, Download, LockKeyhole, Pencil, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import type { AdminTableActionItem, AdminTableColumn } from '@/components/admin/data-table'

import { addUser, changeUserStatus, delUser, deptTreeSelect, exportUser, getUser, listUser, resetUserPwd, updateUser } from '@/api/system/user'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminDateRangePicker from '@/components/admin/AdminDateRangePicker.vue'
import AdminFormField from '@/components/admin/AdminFormField.vue'
import AdminTableActions from '@/components/admin/AdminTableActions.vue'
import AdminQueryPanel from '@/components/admin/AdminQueryPanel.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import AdminTreeList from '@/components/admin/AdminTreeList.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAccess } from '@/lib/access'
import { saveBlob } from '@/lib/download'
import { permissionKeys } from '@/lib/permission-keys'
import { buildDateRangeParams, buildTreeFromFlat, flattenTree } from '@/lib/tree'

const router = useRouter()
const access = useAccess()
const userPerms = permissionKeys.system.user

const userTableColumns: AdminTableColumn[] = [
  { key: 'userId', title: '用户编号' },
  { key: 'userName', title: '用户名' },
  { key: 'nickName', title: '用户昵称' },
  { key: 'deptName', title: '部门' },
  { key: 'phonenumber', title: '手机号码' },
  { key: 'status', title: '状态', headerClass: 'text-center', cellClass: 'text-center' },
  { key: 'createTime', title: '创建时间' },
]

const loading = ref(false)
const submitting = ref(false)
const rows = ref<any[]>([])
const total = ref(0)
const deptOptions = ref<any[]>([])
const roleOptions = ref<any[]>([])
const postOptions = ref<any[]>([])
const selectedDeptId = ref('')
const deptFilterMobileOpen = ref(false)

const formOpen = ref(false)
const resetPwdOpen = ref(false)
const formTitle = ref('新增用户')
const passwordForm = reactive({ userId: '', userName: '', password: '123456' })

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  userName: '',
  phonenumber: '',
  status: 'all',
  beginDate: '',
  endDate: '',
})

const form = reactive(defaultForm())

const canAddUser = computed(() => access.can(userPerms.add))
const canEditUser = computed(() => access.can(userPerms.edit))
const canRemoveUser = computed(() => access.can(userPerms.remove))
const canExportUser = computed(() => access.can(userPerms.export))
const canResetUserPwd = computed(() => access.can(userPerms.resetPwd))
const canAssignUserRole = computed(() => access.can(userPerms.edit))
const canChangeUserStatus = computed(() => access.can(userPerms.edit))
const userRowActions: AdminTableActionItem[] = [
  { label: '修改', icon: Pencil, visible: (row) => canEditUser.value && !isProtectedUser(row), onClick: (row) => openEdit(row) },
  { label: '角色', icon: ShieldCheck, visible: (row) => canAssignUserRole.value && !isProtectedUser(row), onClick: (row) => goAuthRole(row) },
  { label: '密码', icon: LockKeyhole, visible: (row) => canResetUserPwd.value && !isProtectedUser(row), onClick: (row) => openResetPassword(row) },
  { label: '删除', icon: Trash2, tone: 'danger', visible: (row) => canRemoveUser.value && !isProtectedUser(row), onClick: (row) => removeRow(row) },
]

const flatDeptNodes = computed(() => flattenTree(deptOptions.value, {
  getId: node => node.id ?? node.deptId,
  getLabel: node => String(node.label ?? node.deptName ?? '--'),
  getChildren: node => node.children,
}))
const selectedDeptLabel = computed(() => {
  if (!selectedDeptId.value) {
    return '全部部门'
  }
  return flatDeptNodes.value.find(node => String(node.id) === selectedDeptId.value)?.label ?? '全部部门'
})
const mobilePageCount = computed(() => Math.max(1, Math.ceil(total.value / Math.max(queryParams.pageSize, 1))))

function defaultForm() {
  return {
    userId: '',
    deptId: '',
    userName: '',
    nickName: '',
    password: '123456',
    phonenumber: '',
    email: '',
    sex: '0',
    status: '0',
    remark: '',
    postIds: [] as Array<string | number>,
    roleIds: [] as Array<string | number>,
  }
}

function resetFormState() {
  Object.assign(form, defaultForm())
}

function applyFormData(source: Record<string, any>) {
  Object.assign(form, defaultForm(), {
    ...source,
    userId: source.userId ? String(source.userId) : '',
    deptId: source.deptId ? String(source.deptId) : '',
    postIds: Array.isArray(source.postIds) ? source.postIds.map((item: unknown) => String(item)) : [],
    roleIds: Array.isArray(source.roleIds) ? source.roleIds.map((item: unknown) => String(item)) : [],
  })
}

function buildQuery() {
  return {
    pageNum: queryParams.pageNum,
    pageSize: queryParams.pageSize,
    userName: queryParams.userName || undefined,
    phonenumber: queryParams.phonenumber || undefined,
    status: queryParams.status === 'all' ? undefined : queryParams.status,
    deptId: selectedDeptId.value || undefined,
    ...buildDateRangeParams(queryParams.beginDate || undefined, queryParams.endDate || undefined),
  }
}

function isProtectedUser(row: Record<string, any>) {
  return String(row.userId) === '1'
}

function isEnabledOption(item: Record<string, any>) {
  return String(item.status ?? '0') === '0'
}

async function loadDeptTree() {
  const response = await deptTreeSelect()
  deptOptions.value = buildTreeFromFlat(Array.isArray(response.data) ? response.data : [], {
    getId: node => node.deptId ?? node.id,
    getLabel: node => String(node.deptName ?? node.label ?? '--'),
    getChildren: node => node.children,
    getParentId: node => node.parentId,
  })
}

async function loadList() {
  loading.value = true
  try {
    const response = await listUser(buildQuery())
    rows.value = Array.isArray(response.rows) ? response.rows : []
    total.value = Number(response.total ?? 0)
  }
  catch (error) {
    toast.error('用户列表加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    loading.value = false
  }
}

async function loadFormOptions(userId?: string) {
  const response = await getUser(userId)
  roleOptions.value = Array.isArray(response.roles) ? response.roles : []
  postOptions.value = Array.isArray(response.posts) ? response.posts : []
  return response
}

async function handleQuery() {
  queryParams.pageNum = 1
  await loadList()
}

async function handleResetQuery() {
  queryParams.pageNum = 1
  queryParams.pageSize = 10
  queryParams.userName = ''
  queryParams.phonenumber = ''
  queryParams.status = 'all'
  queryParams.beginDate = ''
  queryParams.endDate = ''
  selectedDeptId.value = ''
  await loadList()
}

async function handleDeptFilterChange(value: string) {
  selectedDeptId.value = value
  if (typeof window !== 'undefined' && window.innerWidth < 1280) {
    deptFilterMobileOpen.value = false
  }
  await handleQuery()
}

async function handleExport() {
  if (!access.require(userPerms.export, '导出用户')) {
    return
  }

  try {
    const blob = await exportUser(buildQuery())
    saveBlob(blob, 'user.xlsx')
    toast.success('用户数据导出成功')
  }
  catch (error) {
    toast.error('用户数据导出失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function openCreate() {
  if (!access.require(userPerms.add, '新增用户')) {
    return
  }

  resetFormState()
  formTitle.value = '新增用户'
  try {
    await loadFormOptions()
    formOpen.value = true
  }
  catch (error) {
    toast.error('用户表单初始化失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function openEdit(row: Record<string, any>) {
  if (isProtectedUser(row)) {
    toast.warning('内置管理员不允许在此页面修改')
    return
  }
  if (!access.require(userPerms.edit, '修改用户')) {
    return
  }

  resetFormState()
  formTitle.value = '修改用户'
  try {
    const response = await loadFormOptions(String(row.userId))
    applyFormData({
      ...(response.data ?? {}),
      postIds: response.postIds ?? [],
      roleIds: response.roleIds ?? [],
      password: '',
    })
    formOpen.value = true
  }
  catch (error) {
    toast.error('用户信息加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

function validatePassword(value: string, required: boolean) {
  if (!value.trim()) {
    if (required) {
      toast.warning('新增用户时必须填写初始密码')
      return false
    }
    return true
  }
  if (value.length < 5 || value.length > 20) {
    toast.warning('密码长度必须在 5 到 20 位之间')
    return false
  }
  if (!/^[^<>"'|\\]+$/.test(value)) {
    toast.warning('密码不能包含非法字符 < > " \' | \\')
    return false
  }
  return true
}

function validateForm() {
  const userName = form.userName.trim()
  const nickName = form.nickName.trim()
  const phone = form.phonenumber.trim()
  const email = form.email.trim()

  if (!userName) {
    toast.warning('请输入用户名')
    return false
  }
  if (userName.length < 2 || userName.length > 20) {
    toast.warning('用户名长度必须在 2 到 20 个字符之间')
    return false
  }
  if (!nickName) {
    toast.warning('请输入用户昵称')
    return false
  }
  if (!validatePassword(form.password, !form.userId)) {
    return false
  }
  if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
    toast.warning('请输入正确的手机号码')
    return false
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    toast.warning('请输入正确的邮箱地址')
    return false
  }
  return true
}

function normalizePayload() {
  return {
    ...form,
    userId: form.userId || undefined,
    deptId: form.deptId || undefined,
    password: form.userId ? (form.password || undefined) : form.password,
    postIds: form.postIds,
    roleIds: form.roleIds,
  }
}

async function submitForm() {
  const action = form.userId ? userPerms.edit : userPerms.add
  const actionLabel = form.userId ? '修改用户' : '新增用户'
  if (!access.require(action, actionLabel)) {
    return
  }
  if (!validateForm()) {
    return
  }

  submitting.value = true
  try {
    if (form.userId) {
      await updateUser(normalizePayload())
      toast.success('用户修改成功')
    }
    else {
      await addUser(normalizePayload())
      toast.success('用户新增成功')
    }
    formOpen.value = false
    await loadList()
  }
  catch (error) {
    toast.error(form.userId ? '用户修改失败' : '用户新增失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    submitting.value = false
  }
}

async function removeRow(row: Record<string, any>) {
  if (isProtectedUser(row)) {
    toast.warning('内置管理员不允许在此页面删除')
    return
  }
  if (!access.require(userPerms.remove, '删除用户')) {
    return
  }

  try {
    await delUser(row.userId)
    toast.success('用户删除成功')
    await loadList()
  }
  catch (error) {
    toast.error('用户删除失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function toggleStatus(row: Record<string, any>, value: boolean) {
  if (!access.require(userPerms.edit, `${value ? '启用' : '停用'}用户`)) {
    return
  }
  const targetStatus = value ? '0' : '1'
  try {
    await changeUserStatus(row.userId, targetStatus)
    row.status = targetStatus
    toast.success(`${value ? '启用' : '停用'}用户 ${row.userName}`)
  }
  catch (error) {
    toast.error('状态更新失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

function openResetPassword(row: Record<string, any>) {
  if (isProtectedUser(row)) {
    toast.warning('内置管理员不允许在此页面重置密码')
    return
  }
  if (!access.require(userPerms.resetPwd, '重置用户密码')) {
    return
  }
  passwordForm.userId = String(row.userId)
  passwordForm.userName = String(row.userName)
  passwordForm.password = '123456'
  resetPwdOpen.value = true
}

async function submitResetPassword() {
  if (!access.require(userPerms.resetPwd, '重置用户密码')) {
    return
  }
  if (!validatePassword(passwordForm.password, true)) {
    return
  }
  try {
    await resetUserPwd(passwordForm.userId, passwordForm.password)
    toast.success('密码重置成功')
    resetPwdOpen.value = false
  }
  catch (error) {
    toast.error('密码重置失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

function isChecked(list: Array<string | number>, value: string | number) {
  return list.map(item => String(item)).includes(String(value))
}

function toggleMultiSelect(list: Array<string | number>, value: string | number, checked: boolean) {
  const normalized = String(value)
  const next = checked
    ? [...new Set([...list.map(item => String(item)), normalized])]
    : list.map(item => String(item)).filter(item => item !== normalized)
  list.splice(0, list.length, ...next)
}

function goAuthRole(row: Record<string, any>) {
  if (isProtectedUser(row)) {
    toast.warning('内置管理员不允许在此页面分配角色')
    return
  }
  if (!access.require(userPerms.edit, '分配用户角色')) {
    return
  }
  router.push(`/system/user-auth/role/${row.userId}`)
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

onMounted(async () => {
  await Promise.all([loadDeptTree(), loadList()])
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">系统管理 / 用户管理</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight">用户管理</h1>
      </div>
    </div>

    <Collapsible v-model:open="deptFilterMobileOpen" class="xl:hidden">
      <AdminSectionCard title="部门筛选" :description="selectedDeptLabel" card-class="xl:hidden" content-class="space-y-3">
        <template #headerExtra>
          <CollapsibleTrigger as-child>
            <Button variant="outline" size="sm" class="gap-1">
              {{ deptFilterMobileOpen ? '收起筛选' : '展开筛选' }}
              <ChevronUp v-if="deptFilterMobileOpen" class="size-4" />
              <ChevronDown v-else class="size-4" />
            </Button>
          </CollapsibleTrigger>
        </template>
        <CollapsibleContent class="space-y-3">
          <div class="max-h-[18rem] overflow-y-auto surface-scrollbar pr-1">
            <AdminTreeList
              :nodes="deptOptions"
              :model-value="selectedDeptId"
              selection-mode="single"
              :default-expand-all="false"
              :indent-size="14"
              empty-text="暂无部门数据"
              @update:model-value="(value) => handleDeptFilterChange(String(value))"
            >
              <template #toolbarLeading>
                <button
                  type="button"
                  class="flex min-h-8 items-center rounded-[var(--button-radius)] px-3 text-left text-sm transition"
                  :class="selectedDeptId === '' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/60'"
                  @click="handleDeptFilterChange('')"
                >
                  全部部门
                </button>
              </template>
              <template #toolbarTrailing>
                <Button size="sm" variant="ghost" class="h-8 px-2 text-xs" @click="handleDeptFilterChange('')">重置</Button>
              </template>
            </AdminTreeList>
          </div>
        </CollapsibleContent>
      </AdminSectionCard>
    </Collapsible>

    <div class="grid gap-4 xl:grid-cols-[260px_1fr]">
      <AdminSectionCard title="部门筛选" :description="selectedDeptLabel" card-class="hidden xl:block" content-class="space-y-2">
        <AdminTreeList
          :nodes="deptOptions"
          :model-value="selectedDeptId"
          selection-mode="single"
          :default-expand-all="false"
          :indent-size="14"
          empty-text="暂无部门数据"
          @update:model-value="(value) => handleDeptFilterChange(String(value))"
        >
          <template #toolbarLeading>
            <button
              type="button"
              class="flex min-h-8 items-center rounded-[var(--button-radius)] px-3 text-left text-sm transition"
              :class="selectedDeptId === '' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/60'"
              @click="handleDeptFilterChange('')"
            >
              全部部门
            </button>
          </template>
          <template #toolbarTrailing>
            <Button size="sm" variant="ghost" class="h-8 px-2 text-xs" @click="handleDeptFilterChange('')">重置</Button>
          </template>
        </AdminTreeList>
      </AdminSectionCard>

      <div class="space-y-4">
        <AdminQueryPanel grid-class="md:grid-cols-2 xl:grid-cols-3" advanced-grid-class="md:grid-cols-2 xl:grid-cols-3" @query="handleQuery" @reset="handleResetQuery">
          <AdminFormField label="用户名">
            <Input v-model="queryParams.userName" placeholder="请输入用户名" />
          </AdminFormField>
          <AdminFormField label="手机号码">
            <Input v-model="queryParams.phonenumber" placeholder="请输入手机号码" />
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
          <template #advanced>
            <AdminFormField label="日期范围" field-class="md:col-span-2">
              <AdminDateRangePicker v-model:start="queryParams.beginDate" v-model:end="queryParams.endDate" />
            </AdminFormField>
          </template>
        </AdminQueryPanel>

        <AdminSectionCard title="用户列表">
          <template #headerExtra>
            <Button v-if="canAddUser" size="sm" @click="openCreate">
              <Plus class="size-4" />
              新增用户
            </Button>
            <Button v-if="canExportUser" variant="outline" size="sm" @click="handleExport">
              <Download class="size-4" />
              导出用户
            </Button>
            <Button variant="outline" size="sm" @click="loadList">
              <RefreshCw class="size-4" />
              刷新
            </Button>
          </template>
          <div v-if="loading && !rows.length" class="rounded-3xl border border-border/60 bg-muted/15 px-4 py-8 text-center text-sm text-muted-foreground md:hidden">
            正在加载用户数据...
          </div>
          <div v-else-if="rows.length" class="space-y-3 md:hidden">
            <div v-for="row in rows" :key="String(row.userId)" class="rounded-3xl border border-border/60 bg-muted/10 p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-base font-semibold">{{ row.userName || '--' }}</p>
                  <p class="mt-1 text-sm text-muted-foreground">{{ row.nickName || '--' }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <Switch v-if="canChangeUserStatus" :model-value="String(row.status) === '0'" @update:model-value="(value) => toggleStatus(row, Boolean(value))" />
                  <Badge variant="outline">{{ statusText(String(row.status)) }}</Badge>
                </div>
              </div>

              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div class="space-y-1">
                  <p class="text-xs text-muted-foreground">部门</p>
                  <p class="break-all text-sm font-medium">{{ row.dept?.deptName ?? row.deptName ?? '--' }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-xs text-muted-foreground">手机号码</p>
                  <p class="break-all text-sm font-medium">{{ row.phonenumber || '--' }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-xs text-muted-foreground">用户编号</p>
                  <p class="text-sm font-medium">{{ row.userId ?? '--' }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-xs text-muted-foreground">创建时间</p>
                  <p class="text-sm font-medium">{{ row.createTime ?? '--' }}</p>
                </div>
              </div>

              <div class="mt-4 border-t border-border/60 pt-3">
                <AdminTableActions :row="row" :items="userRowActions" :collapse-after="4" :inline-limit="4" />
              </div>
            </div>
          </div>
          <div v-else class="rounded-3xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground md:hidden">
            暂无数据
          </div>

          <div class="rounded-[var(--radius-lg)] border border-border/60 bg-muted/15 px-3 py-3 md:hidden">
            <div class="flex items-center justify-between text-sm text-muted-foreground">
              <span>共 {{ total }} 条</span>
              <Select :model-value="String(queryParams.pageSize)" @update:model-value="changePageSize(Number($event))">
                <SelectTrigger class="h-9 w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / 页</SelectItem>
                  <SelectItem value="20">20 / 页</SelectItem>
                  <SelectItem value="50">50 / 页</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="mt-3 flex items-center gap-2">
              <Button variant="outline" size="sm" class="flex-1" :disabled="queryParams.pageNum <= 1" @click="changePage(-1)">上一页</Button>
              <span class="min-w-[5rem] text-center text-sm text-muted-foreground">{{ queryParams.pageNum }} / {{ mobilePageCount }}</span>
              <Button variant="outline" size="sm" class="flex-1" :disabled="queryParams.pageNum >= mobilePageCount" @click="changePage(1)">下一页</Button>
            </div>
          </div>

          <div class="hidden md:block">
            <AdminDataTable
            :columns="userTableColumns"
            :rows="rows"
            row-key="userId"
            :loading="loading"
            loading-text="正在加载用户数据..."
            empty-text="暂无数据"
            :actions="userRowActions"
            action-header-class="w-[240px] text-right"
            :show-pagination="true"
            :total="total"
            :page-num="queryParams.pageNum"
            :page-size="queryParams.pageSize"
            @update:page-size="changePageSize"
            @update:page-num="changePage($event - queryParams.pageNum)"
            @previous="changePage(-1)"
            @next="changePage(1)"
          >
            <template #cell-userName="{ value }">
              <span class="font-medium">{{ value }}</span>
            </template>
            <template #cell-deptName="{ row }">
              {{ row.dept?.deptName ?? row.deptName ?? '--' }}
            </template>
            <template #cell-phonenumber="{ row }">
              {{ row.phonenumber || '--' }}
            </template>
            <template #cell-status="{ row }">
              <div class="flex items-center justify-center gap-2">
                <Switch v-if="canChangeUserStatus" :model-value="String(row.status) === '0'" @update:model-value="(value) => toggleStatus(row, Boolean(value))" />
                <Badge variant="outline">{{ statusText(String(row.status)) }}</Badge>
              </div>
            </template>
          </AdminDataTable>
          </div>
        </AdminSectionCard>
      </div>
    </div>

    <Dialog v-model:open="formOpen">
      <DialogContent class="sm:max-w-[860px]">
        <DialogHeader>
          <DialogTitle>{{ formTitle }}</DialogTitle>
          <DialogDescription>{{ form.userId ? '修改用户资料。' : '创建新的用户。' }}</DialogDescription>

        </DialogHeader>

        <div class="grid gap-4 md:grid-cols-2">
          <AdminFormField label="归属部门">
            <Select v-model="form.deptId">
              <SelectTrigger><SelectValue placeholder="请选择部门" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="node in flatDeptNodes" :key="node.id" :value="String(node.id)">{{ '　'.repeat(node.depth) }}{{ node.label }}</SelectItem>
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField label="用户名">
            <Input v-model="form.userName" placeholder="请输入用户名" :disabled="Boolean(form.userId)" />
          </AdminFormField>
          <AdminFormField label="用户昵称">
            <Input v-model="form.nickName" placeholder="请输入用户昵称" />
          </AdminFormField>
          <AdminFormField label="初始密码">
            <Input v-model="form.password" type="password" :placeholder="form.userId ? '留空则不修改密码' : '请输入初始密码'" />
          </AdminFormField>
          <AdminFormField label="手机号码">
            <Input v-model="form.phonenumber" placeholder="请输入手机号码" />
          </AdminFormField>
          <AdminFormField label="邮箱">
            <Input v-model="form.email" placeholder="请输入邮箱" />
          </AdminFormField>
          <AdminFormField label="性别">
            <Select v-model="form.sex">
              <SelectTrigger><SelectValue placeholder="请选择性别" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">男</SelectItem>
                <SelectItem value="1">女</SelectItem>
                <SelectItem value="2">未知</SelectItem>
              </SelectContent>
            </Select>
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
          <AdminFormField label="岗位" field-class="md:col-span-2">
            <div class="grid gap-3 rounded-3xl border border-border/70 bg-muted/25 p-4 sm:grid-cols-2 xl:grid-cols-3">
              <label v-for="item in postOptions" :key="item.postId" class="flex items-center gap-3 text-sm" :class="!isEnabledOption(item) ? 'opacity-50' : ''">
                <Checkbox :disabled="!isEnabledOption(item)" :checked="isChecked(form.postIds, item.postId)" @update:checked="(checked: boolean | 'indeterminate') => toggleMultiSelect(form.postIds, item.postId, Boolean(checked))" />
                <span>{{ item.postName }}</span>
              </label>
              <p v-if="!postOptions.length" class="text-sm text-muted-foreground">暂无岗位数据</p>
            </div>
          </AdminFormField>
          <AdminFormField label="角色" field-class="md:col-span-2">
            <div class="grid gap-3 rounded-3xl border border-border/70 bg-muted/25 p-4 sm:grid-cols-2 xl:grid-cols-3">
              <label v-for="item in roleOptions" :key="item.roleId" class="flex items-center gap-3 text-sm" :class="!isEnabledOption(item) ? 'opacity-50' : ''">
                <Checkbox :disabled="!isEnabledOption(item)" :checked="isChecked(form.roleIds, item.roleId)" @update:checked="(checked: boolean | 'indeterminate') => toggleMultiSelect(form.roleIds, item.roleId, Boolean(checked))" />
                <span>{{ item.roleName }}</span>
              </label>
              <p v-if="!roleOptions.length" class="text-sm text-muted-foreground">暂无角色数据</p>
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

    <Dialog v-model:open="resetPwdOpen">
      <DialogContent class="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>重置密码</DialogTitle>
          <DialogDescription>为当前用户设置新的登录密码。</DialogDescription>
        </DialogHeader>
        <AdminFormField label="新密码">
          <Input v-model="passwordForm.password" type="password" placeholder="请输入新密码" />
        </AdminFormField>
        <DialogFooter>
          <Button variant="outline" class="w-full sm:w-auto" @click="resetPwdOpen = false">取消</Button>
          <Button class="w-full sm:w-auto" @click="submitResetPassword">确认重置</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>


















