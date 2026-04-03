<script setup lang="ts">
import { ArrowLeft, ShieldCheck } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import type { AdminTableColumn } from '@/components/admin/data-table'

import { getAuthRole, updateAuthRole } from '@/api/system/user'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useAccess } from '@/lib/access'
import { permissionKeys } from '@/lib/permission-keys'

const route = useRoute()
const router = useRouter()
const access = useAccess()
const canSubmitAuth = computed(() => access.can(permissionKeys.system.user.edit))

const roleColumns: AdminTableColumn[] = [
  { key: 'roleId', title: '角色编号' },
  { key: 'roleName', title: '角色名称' },
  { key: 'roleKey', title: '权限字符' },
  { key: 'status', title: '状态', headerClass: 'text-center', cellClass: 'text-center' },
  { key: 'createTime', title: '创建时间' },
]

const loading = ref(false)
const submitting = ref(false)
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const roles = ref<any[]>([])
const selectedRoleIds = ref<string[]>([])

const userForm = reactive({
  userId: '',
  userName: '',
  nickName: '',
})

const pagedRoles = computed(() => roles.value.slice((pageNum.value - 1) * pageSize.value, pageNum.value * pageSize.value))
const selectableVisibleRoleIds = computed(() => pagedRoles.value.filter(row => isSelectable(row)).map(row => String(row.roleId)))
const allVisibleSelected = computed(() => selectableVisibleRoleIds.value.length > 0 && selectableVisibleRoleIds.value.every(id => selectedRoleIds.value.includes(id)))
const someVisibleSelected = computed(() => !allVisibleSelected.value && selectableVisibleRoleIds.value.some(id => selectedRoleIds.value.includes(id)))

function isSelectable(row: Record<string, any>) {
  return String(row.status) === '0'
}

function statusText(value: unknown) {
  return String(value) === '0' ? '正常' : '停用'
}

function toggleRole(row: Record<string, any>, checked: boolean | 'indeterminate') {
  if (!canSubmitAuth.value || !isSelectable(row)) {
    return
  }

  const roleId = String(row.roleId)
  if (Boolean(checked)) {
    if (!selectedRoleIds.value.includes(roleId)) {
      selectedRoleIds.value = [...selectedRoleIds.value, roleId]
    }
    return
  }

  selectedRoleIds.value = selectedRoleIds.value.filter(id => id !== roleId)
}

function toggleVisibleRoles(checked: boolean | 'indeterminate') {
  if (!canSubmitAuth.value) {
    return
  }

  if (Boolean(checked)) {
    const merged = new Set([...selectedRoleIds.value, ...selectableVisibleRoleIds.value])
    selectedRoleIds.value = [...merged]
    return
  }

  const visibleSet = new Set(selectableVisibleRoleIds.value)
  selectedRoleIds.value = selectedRoleIds.value.filter(id => !visibleSet.has(id))
}

async function loadRoles() {
  const userId = route.params.userId
  if (!userId) {
    toast.error('缺少用户 ID，无法分配角色')
    return
  }

  loading.value = true
  try {
    const response = await getAuthRole(String(userId))
    Object.assign(userForm, {
      userId: String(response.user?.userId ?? userId),
      userName: String(response.user?.userName ?? ''),
      nickName: String(response.user?.nickName ?? ''),
    })
    roles.value = Array.isArray(response.roles) ? response.roles : []
    selectedRoleIds.value = roles.value.filter(row => row.flag && isSelectable(row)).map(row => String(row.roleId))
    total.value = roles.value.length
  }
  catch (error) {
    toast.error('角色数据加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    loading.value = false
  }
}

async function submitForm() {
  if (!access.require(permissionKeys.system.user.edit, '分配用户角色')) {
    return
  }

  submitting.value = true
  try {
    await updateAuthRole({
      userId: userForm.userId,
      roleIds: selectedRoleIds.value.join(','),
    })
    toast.success('角色分配成功')
    router.push('/system/user')
  }
  catch (error) {
    toast.error('角色分配失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    submitting.value = false
  }
}

function changePage(step: number) {
  const nextPage = pageNum.value + step
  const maxPage = Math.max(1, Math.ceil(total.value / pageSize.value))
  if (nextPage < 1 || nextPage > maxPage) {
    return
  }
  pageNum.value = nextPage
}

function changePageSize(value: number) {
  pageNum.value = 1
  pageSize.value = value
}

onMounted(loadRoles)
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">系统管理 / 分配角色</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight">分配角色</h1>
    </div>

    <AdminSectionCard title="用户信息">
      <template #headerExtra>
        <Button variant="outline" size="sm" @click="router.push('/system/user')">
          <ArrowLeft class="size-4" />
          返回用户列表
        </Button>
      </template>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div class="rounded-[var(--radius-xl)] border border-border/60 bg-muted/20 px-4 py-4">
          <p class="text-sm text-muted-foreground">用户昵称</p>
          <p class="mt-2 break-all text-base font-medium">{{ userForm.nickName || '--' }}</p>
        </div>
        <div class="rounded-[var(--radius-xl)] border border-border/60 bg-muted/20 px-4 py-4">
          <p class="text-sm text-muted-foreground">登录账号</p>
          <p class="mt-2 break-all text-base font-medium">{{ userForm.userName || '--' }}</p>
        </div>
        <div class="rounded-[var(--radius-xl)] border border-border/60 bg-muted/20 px-4 py-4 sm:col-span-2 xl:col-span-1">
          <p class="text-sm text-muted-foreground">已选角色数</p>
          <p class="mt-2 text-base font-medium">{{ selectedRoleIds.length }}</p>
        </div>
      </div>
    </AdminSectionCard>

    <AdminSectionCard title="角色列表">
      <template #headerExtra>
        <Badge variant="outline">已选 {{ selectedRoleIds.length }} 个角色</Badge>
        <Button v-if="canSubmitAuth" size="sm" :disabled="submitting" @click="submitForm">
          <ShieldCheck class="size-4" />
          {{ submitting ? '提交中...' : '提交授权' }}
        </Button>
      </template>
      <AdminDataTable
        :columns="roleColumns"
        :rows="pagedRoles"
        row-key="roleId"
        :loading="loading"
        loading-text="正在加载角色数据..."
        empty-text="暂无角色数据"
        action-header-class="w-[1px]"
        :show-pagination="true"
        :total="total"
        :page-num="pageNum"
        :page-size="pageSize"
        @update:page-size="changePageSize"
        @update:page-num="changePage($event - pageNum)"
        @previous="changePage(-1)"
        @next="changePage(1)"
      >
        <template #selection-header>
          <Checkbox :disabled="!canSubmitAuth" :checked="allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false" @update:checked="toggleVisibleRoles" />
        </template>
        <template #selection="{ row }">
          <Checkbox :disabled="!canSubmitAuth || !isSelectable(row)" :checked="selectedRoleIds.includes(String(row.roleId))" @update:checked="toggleRole(row, $event)" />
        </template>
        <template #cell-roleName="{ value }">
          <span class="font-medium">{{ value }}</span>
        </template>
        <template #cell-status="{ row }">
          <Badge :variant="String(row.status) === '0' ? 'outline' : 'destructive'">{{ statusText(row.status) }}</Badge>
        </template>
      </AdminDataTable>
    </AdminSectionCard>
  </div>
</template>




