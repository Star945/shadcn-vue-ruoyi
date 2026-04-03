<script setup lang="ts">
import { ArrowLeft, ShieldX, UserPlus } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import type { AdminTableActionItem, AdminTableColumn } from '@/components/admin/data-table'

import { allocatedUserList, authUserCancel, authUserCancelAll, getRole } from '@/api/system/role'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminFormField from '@/components/admin/AdminFormField.vue'
import AdminQueryPanel from '@/components/admin/AdminQueryPanel.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import SelectUserDialog from '@/views/system/role/SelectUserDialog.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAccess } from '@/lib/access'
import { permissionKeys } from '@/lib/permission-keys'

const route = useRoute()
const router = useRouter()
const access = useAccess()
const rolePerms = permissionKeys.system.role

const userColumns: AdminTableColumn[] = [
  { key: 'userName', title: '用户名称' },
  { key: 'nickName', title: '用户昵称' },
  { key: 'email', title: '邮箱' },
  { key: 'phonenumber', title: '手机号码' },
  { key: 'status', title: '状态', headerClass: 'text-center', cellClass: 'text-center' },
  { key: 'createTime', title: '创建时间' },
]

const loading = ref(false)
const rows = ref<any[]>([])
const total = ref(0)
const selectedRows = ref<any[]>([])
const selectedRowKeys = ref<Array<string | number>>([])
const selectDialogOpen = ref(false)
const roleName = ref('')
const roleKey = ref('')

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  roleId: String(route.params.roleId ?? ''),
  userName: '',
  phonenumber: '',
})

const canAddAuthorizedUser = computed(() => access.can(rolePerms.add))
const canCancelAuthorizedUser = computed(() => access.can(rolePerms.remove))
const authorizedUserRowActions: AdminTableActionItem[] = [
  { label: '取消', icon: ShieldX, tone: 'danger', visible: () => canCancelAuthorizedUser.value, onClick: (row) => removeAuth(row) },
]

function statusText(value: unknown) {
  return String(value) === '0' ? '正常' : '停用'
}

function resetSelection() {
  selectedRows.value = []
  selectedRowKeys.value = []
}

async function loadRoleContext() {
  if (!queryParams.roleId) {
    return
  }

  try {
    const response = await getRole(queryParams.roleId)
    roleName.value = String(response.data?.roleName ?? '')
    roleKey.value = String(response.data?.roleKey ?? '')
  }
  catch {
  }
}

async function loadList() {
  if (!queryParams.roleId) {
    toast.error('缺少角色 ID，无法查询授权用户')
    return
  }

  loading.value = true
  resetSelection()
  try {
    const response = await allocatedUserList({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      roleId: queryParams.roleId,
      userName: queryParams.userName || undefined,
      phonenumber: queryParams.phonenumber || undefined,
    })
    rows.value = Array.isArray(response.rows) ? response.rows : []
    total.value = Number(response.total ?? 0)
  }
  catch (error) {
    toast.error('授权用户加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    loading.value = false
  }
}

function handleSelectionChange(rowsOnPage: Array<Record<string, any>>, keys: Array<string | number>) {
  selectedRows.value = rowsOnPage
  selectedRowKeys.value = keys
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
  await loadList()
}

async function removeAuth(row?: Record<string, any>) {
  if (!access.require(rolePerms.remove, '取消角色授权用户')) {
    return
  }

  const userIds = row?.userId ? [row.userId] : selectedRows.value.map(item => item.userId)
  if (!userIds.length) {
    toast.warning('请先选择需要取消授权的用户')
    return
  }

  try {
    if (row?.userId) {
      await authUserCancel({ userId: row.userId, roleId: queryParams.roleId })
    }
    else {
      await authUserCancelAll({ roleId: queryParams.roleId, userIds: userIds.join(',') })
    }
    toast.success('授权关系已取消')
    await loadList()
  }
  catch (error) {
    toast.error('取消授权失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
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

async function handleSelectOk() {
  await loadList()
}

function openSelectDialog() {
  if (!access.require(rolePerms.add, '添加角色授权用户')) {
    return
  }
  selectDialogOpen.value = true
}

onMounted(async () => {
  await Promise.all([loadRoleContext(), loadList()])
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">系统管理 / 分配用户</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight">分配用户</h1>
    </div>

    <AdminSectionCard title="角色信息">
      <template #headerExtra>
        <Button variant="outline" size="sm" @click="router.push('/system/role')">
          <ArrowLeft class="size-4" />
          返回角色列表
        </Button>
      </template>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div class="rounded-[var(--radius-xl)] border border-border/60 bg-muted/20 px-4 py-4">
          <p class="text-sm text-muted-foreground">角色名称</p>
          <p class="mt-2 break-all text-base font-medium">{{ roleName || '--' }}</p>
        </div>
        <div class="rounded-[var(--radius-xl)] border border-border/60 bg-muted/20 px-4 py-4">
          <p class="text-sm text-muted-foreground">权限字符</p>
          <p class="mt-2 break-all text-base font-medium">{{ roleKey || '--' }}</p>
        </div>
        <div class="rounded-[var(--radius-xl)] border border-border/60 bg-muted/20 px-4 py-4 sm:col-span-2 xl:col-span-1">
          <p class="text-sm text-muted-foreground">当前页选中</p>
          <p class="mt-2 text-base font-medium">{{ selectedRows.length }}</p>
        </div>
      </div>
    </AdminSectionCard>

    <AdminQueryPanel @query="handleQuery" @reset="handleResetQuery">
      <AdminFormField label="用户名称">
        <Input v-model="queryParams.userName" placeholder="请输入用户名称" />
      </AdminFormField>
      <AdminFormField label="手机号码">
        <Input v-model="queryParams.phonenumber" placeholder="请输入手机号码" />
      </AdminFormField>
    </AdminQueryPanel>

    <AdminSectionCard title="已授权用户列表">
      <template #headerExtra>
        <Badge variant="outline">已选 {{ selectedRows.length }} 项</Badge>
        <Button v-if="canAddAuthorizedUser" size="sm" @click="openSelectDialog">
          <UserPlus class="size-4" />
          添加用户
        </Button>
        <Button
          v-if="canCancelAuthorizedUser"
          variant="outline"
          size="sm"
          :disabled="selectedRows.length === 0"
          @click="removeAuth()"
        >
          <ShieldX class="size-4" />
          批量取消
        </Button>
      </template>
      <AdminDataTable
        :columns="userColumns"
        :rows="rows"
        row-key="userId"
        :loading="loading"
        loading-text="正在加载授权用户..."
        empty-text="当前角色暂无授权用户"
        show-selection
        :selected-row-keys="selectedRowKeys"
        :actions="authorizedUserRowActions"
        action-header-class="w-[96px] text-right"
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
        <template #cell-userName="{ value }">
          <span class="font-medium">{{ value }}</span>
        </template>
        <template #cell-status="{ row }">
          <Badge :variant="String(row.status) === '0' ? 'outline' : 'destructive'">{{ statusText(row.status) }}</Badge>
        </template>
      </AdminDataTable>
    </AdminSectionCard>

    <SelectUserDialog v-model:open="selectDialogOpen" :role-id="queryParams.roleId" @ok="handleSelectOk" />
  </div>
</template>





