<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'
import { LogOut, RefreshCw } from 'lucide-vue-next'

import type { AdminTableActionItem, AdminTableColumn } from '@/components/admin/data-table'

import { forceLogout, list } from '@/api/monitor/online'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminFormField from '@/components/admin/AdminFormField.vue'
import AdminQueryPanel from '@/components/admin/AdminQueryPanel.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAccess } from '@/lib/access'
import { permissionKeys } from '@/lib/permission-keys'

const access = useAccess()
const onlinePerms = permissionKeys.monitor.online

const onlineTableColumns: AdminTableColumn[] = [
  { key: 'tokenId', title: '会话编号' },
  { key: 'userName', title: '登录名称' },
  { key: 'deptName', title: '所属部门' },
  { key: 'ipaddr', title: '登录地址' },
  { key: 'loginLocation', title: '登录地点' },
  { key: 'os', title: '操作系统' },
  { key: 'browser', title: '浏览器' },
  { key: 'loginTime', title: '登录时间' },
]

const loading = ref(false)
const allRows = ref<any[]>([])
const total = ref(0)

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  ipaddr: '',
  userName: '',
})

const canForceLogout = computed(() => access.can(onlinePerms.forceLogout))
const onlineRowActions: AdminTableActionItem[] = [
  { label: '强退', icon: LogOut, tone: 'danger', visible: () => canForceLogout.value, onClick: (row) => handleForceLogout(row) },
]

const pagedRows = computed(() => {
  const start = (queryParams.pageNum - 1) * queryParams.pageSize
  return allRows.value.slice(start, start + queryParams.pageSize)
})

async function loadList() {
  loading.value = true
  try {
    const response = await list({
      ipaddr: queryParams.ipaddr || undefined,
      userName: queryParams.userName || undefined,
    })
    allRows.value = Array.isArray(response.rows) ? response.rows : []
    total.value = Number(response.total ?? allRows.value.length)
    if ((queryParams.pageNum - 1) * queryParams.pageSize >= total.value && queryParams.pageNum > 1) {
      queryParams.pageNum = Math.max(1, Math.ceil(total.value / queryParams.pageSize))
    }
  }
  catch (error) {
    toast.error('在线用户加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
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
  queryParams.ipaddr = ''
  queryParams.userName = ''
  await loadList()
}

async function handleForceLogout(row: Record<string, any>) {
  if (!access.require(onlinePerms.forceLogout, '强退在线用户')) {
    return
  }

  try {
    await forceLogout(String(row.tokenId))
    toast.success(`已强退用户 ${row.userName}`)
    await loadList()
  }
  catch (error) {
    toast.error('强退失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

async function changePage(step: number) {
  const nextPage = queryParams.pageNum + step
  const maxPage = Math.max(1, Math.ceil(total.value / queryParams.pageSize))
  if (nextPage < 1 || nextPage > maxPage) {
    return
  }
  queryParams.pageNum = nextPage
}

async function changePageSize(value: number) {
  queryParams.pageNum = 1
  queryParams.pageSize = value
}

onMounted(loadList)
</script>

<template>
  <div class="space-y-6">
    <div>
        <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">系统监控 / 在线用户</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight">在线用户</h1>
      </div>

    <AdminQueryPanel
      grid-class="md:grid-cols-2"
      @query="handleQuery"
      @reset="handleResetQuery"
    >
      <AdminFormField label="登录地址">
        <Input v-model="queryParams.ipaddr" placeholder="请输入登录地址" />
      </AdminFormField>
      <AdminFormField label="登录名称">
        <Input v-model="queryParams.userName" placeholder="请输入登录名称" />
      </AdminFormField>
    </AdminQueryPanel>

    <AdminSectionCard title="在线会话">
      <template #headerExtra>
        <Badge variant="outline">共 {{ total }} 个会话</Badge>
        <Button variant="outline" size="sm" class="gap-1" @click="loadList">
          <RefreshCw class="size-3.5" />
          刷新
        </Button>
      </template>
      <AdminDataTable
        :columns="onlineTableColumns"
        :rows="pagedRows"
        row-key="tokenId"
        :loading="loading"
        loading-text="正在加载在线用户..."
        empty-text="当前暂无在线用户"
        :actions="onlineRowActions"
        action-header-class="w-[112px] text-right"
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
      </AdminDataTable>
    </AdminSectionCard>
  </div>
</template>



