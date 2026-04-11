<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import type { AdminTableColumn } from '@/components/admin/data-table'

import { authUserSelectAll, unallocatedUserList } from '@/api/system/role'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminFormField from '@/components/admin/AdminFormField.vue'
import AdminQueryPanel from '@/components/admin/AdminQueryPanel.vue'

import AdminDialogContent from '@/components/admin/AdminDialogContent.vue'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAccess } from '@/lib/access'
import { permissionKeys } from '@/lib/permission-keys'

const props = defineProps<{
  open: boolean
  roleId: string | number
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'ok'): void
}>()

const access = useAccess()
const canAssignUser = computed(() => access.can(permissionKeys.system.role.add))

const userColumns: AdminTableColumn[] = [
  { key: 'userName', title: '用户名称' },
  { key: 'nickName', title: '用户昵称' },
  { key: 'email', title: '邮箱' },
  { key: 'phonenumber', title: '手机号码' },
  { key: 'status', title: '状态', headerClass: 'text-center', cellClass: 'text-center' },
  { key: 'createTime', title: '创建时间' },
]

const loading = ref(false)
const submitting = ref(false)
const rows = ref<any[]>([])
const total = ref(0)
const selectedRows = ref<any[]>([])
const selectedRowKeys = ref<Array<string | number>>([])

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  userName: '',
  phonenumber: '',
})

function statusText(value: unknown) {
  return String(value) === '0' ? '正常' : '停用'
}

function closeDialog() {
  emit('update:open', false)
}

function resetSelection() {
  selectedRows.value = []
  selectedRowKeys.value = []
}

async function loadList() {
  if (!props.roleId) {
    return
  }

  loading.value = true
  resetSelection()
  try {
    const response = await unallocatedUserList({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      roleId: props.roleId,
      userName: queryParams.userName || undefined,
      phonenumber: queryParams.phonenumber || undefined,
    })
    rows.value = Array.isArray(response.rows) ? response.rows : []
    total.value = Number(response.total ?? 0)
  }
  catch (error) {
    toast.error('待选用户加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
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

async function submitSelection() {
  if (!access.require(permissionKeys.system.role.add, '添加角色授权用户')) {
    return
  }

  const userIds = selectedRows.value.map(item => item.userId)
  if (!userIds.length) {
    toast.warning('请先选择需要分配的用户')
    return
  }

  submitting.value = true
  try {
    await authUserSelectAll({
      roleId: props.roleId,
      userIds: userIds.join(','),
    })
    toast.success('用户分配成功')
    emit('ok')
    closeDialog()
  }
  catch (error) {
    toast.error('用户分配失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    submitting.value = false
  }
}

watch(() => props.open, async (open) => {
  if (open) {
    queryParams.pageNum = 1
    await loadList()
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <AdminDialogContent size="5xl">
      <DialogHeader>
        <DialogTitle>选择用户</DialogTitle>
        <DialogDescription>选择要添加的用户。</DialogDescription>
      </DialogHeader>

      <AdminQueryPanel @query="handleQuery" @reset="handleResetQuery">
        <AdminFormField label="用户名称">
          <Input v-model="queryParams.userName" placeholder="请输入用户名称" />
        </AdminFormField>
        <AdminFormField label="手机号码">
          <Input v-model="queryParams.phonenumber" placeholder="请输入手机号码" />
        </AdminFormField>
      </AdminQueryPanel>

      <AdminSectionCard title="待选用户列表" card-class="p-4 sm:p-6">
        <template #headerExtra>
          <Badge variant="outline">已选 {{ selectedRows.length }} 项</Badge>
        </template>
        <AdminDataTable
          :columns="userColumns"
          :rows="rows"
          row-key="userId"
          :loading="loading"
          loading-text="正在加载待选用户..."
          empty-text="暂无可分配用户"
          show-selection
          :selected-row-keys="selectedRowKeys"
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
            <AdminStatusBadge :label="statusText(row.status)" />
          </template>
        </AdminDataTable>
      </AdminSectionCard>

      <DialogFooter class="gap-2 sm:gap-0">
        <Button variant="outline" class="w-full sm:w-auto" @click="closeDialog">取消</Button>
        <Button v-if="canAssignUser" class="w-full sm:w-auto" :disabled="submitting" @click="submitSelection">{{ submitting ? '提交中...' : '确认分配' }}</Button>
      </DialogFooter>
    </AdminDialogContent>
  </Dialog>
</template>


