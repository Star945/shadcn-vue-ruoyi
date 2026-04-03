<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { optionselect } from '@/api/system/dict/type'
import { treeselect } from '@/api/system/menu'
import { getGenTable, updateGenTable } from '@/api/tool/gen'
import AdminFormField from '@/components/admin/AdminFormField.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAccess } from '@/lib/access'
import { permissionKeys } from '@/lib/permission-keys'
import { buildTreeFromFlat, flattenTree } from '@/lib/tree'
import {
  genTypeOptions,
  htmlTypeOptions,
  javaTypeOptions,
  normalizeGenColumns,
  normalizeGenInfo,
  queryTypeOptions,
  tplCategoryLabel,
  tplCategoryOptions,
  tplWebTypeOptions,
} from '@/lib/tool-gen'

const route = useRoute()
const router = useRouter()
const access = useAccess()
const toolGenPerms = permissionKeys.tool.gen

const loading = ref(false)
const submitting = ref(false)
const activeTab = ref<'basic' | 'columns' | 'gen'>('basic')
const rawInfo = ref<Record<string, any>>({})
const columns = ref<Record<string, any>[]>([])
const relatedTables = ref<any[]>([])
const dictOptions = ref<any[]>([])
const menuTree = ref<any[]>([])

const form = reactive(normalizeGenInfo(undefined))

const normalizedMenuTree = computed(() => buildTreeFromFlat(menuTree.value, {
  getId: node => node.id ?? node.menuId,
  getLabel: node => String(node.label ?? node.menuName ?? '--'),
  getChildren: node => node.children,
  getParentId: node => node.parentId,
}))

const menuOptions = computed(() => flattenTree(normalizedMenuTree.value, {
  getId: node => node.id ?? node.menuId,
  getLabel: node => String(node.label ?? node.menuName ?? '--'),
  getChildren: node => node.children,
}))

const relatedSubColumns = computed(() => {
  const matched = relatedTables.value.find(item => String(item.tableName) === String(form.subTableName))
  return Array.isArray(matched?.columns) ? matched.columns : []
})

const fieldOptionColumns = computed(() => columns.value
  .map(column => ({
    value: String(column.columnName ?? ''),
    label: `${column.columnName ?? '--'} / ${column.columnComment ?? '--'}`,
  }))
  .filter(item => item.value))

const pageTitle = computed(() => form.tableName ? `编辑生成配置 / ${form.tableName}` : '编辑生成配置')
const canEditGen = computed(() => access.can(toolGenPerms.edit))

function updateFlag(column: Record<string, any>, key: string, checked: boolean | 'indeterminate') {
  column[key] = Boolean(checked) ? '1' : '0'
}

function updateDictType(column: Record<string, any>, value: unknown) {
  column.dictType = value === '__none__' || value === null ? '' : String(value)
}

function handleTplCategoryChange(value: unknown) {
  const nextValue = value === null ? '' : String(value)
  if (nextValue !== 'tree') {
    form.treeCode = ''
    form.treeName = ''
    form.treeParentCode = ''
  }
  if (nextValue !== 'sub') {
    form.subTableName = ''
    form.subTableFkName = ''
  }
}

function validateForm() {
  if (!form.tableName.trim()) {
    toast.warning('请输入表名称')
    activeTab.value = 'basic'
    return false
  }
  if (!form.tableComment.trim()) {
    toast.warning('请输入表描述')
    activeTab.value = 'basic'
    return false
  }
  if (!form.className.trim()) {
    toast.warning('请输入实体类名称')
    activeTab.value = 'basic'
    return false
  }
  if (!form.functionAuthor.trim()) {
    toast.warning('请输入作者')
    activeTab.value = 'basic'
    return false
  }
  if (!form.packageName.trim()) {
    toast.warning('请输入生成包路径')
    activeTab.value = 'gen'
    return false
  }
  if (!form.moduleName.trim()) {
    toast.warning('请输入生成模块名')
    activeTab.value = 'gen'
    return false
  }
  if (!form.businessName.trim()) {
    toast.warning('请输入生成业务名')
    activeTab.value = 'gen'
    return false
  }
  if (!form.functionName.trim()) {
    toast.warning('请输入生成功能名')
    activeTab.value = 'gen'
    return false
  }
  if (form.genType === '1' && !form.genPath.trim()) {
    toast.warning('自定义路径生成时必须填写生成路径')
    activeTab.value = 'gen'
    return false
  }
  if (form.tplCategory === 'tree' && (!form.treeCode || !form.treeName || !form.treeParentCode)) {
    toast.warning('树表模板需要完整填写树编码、树名称和父编码字段')
    activeTab.value = 'gen'
    return false
  }
  if (form.tplCategory === 'sub' && (!form.subTableName || !form.subTableFkName)) {
    toast.warning('主子表模板需要选择关联子表和子表外键')
    activeTab.value = 'gen'
    return false
  }
  return true
}

function goBack() {
  router.push({
    path: '/tool/gen',
    query: {
      pageNum: String(route.query.pageNum ?? 1),
      t: String(Date.now()),
    },
  })
}

async function loadDetail() {
  const tableId = route.params.tableId
  if (!tableId) {
    toast.error('缺少表 ID，无法加载生成配置')
    return
  }

  loading.value = true
  try {
    const [detailResponse, dictResponse, menuResponse] = await Promise.all([
      getGenTable(String(tableId)),
      optionselect(),
      treeselect(),
    ])

    const data = detailResponse.data ?? {}
    rawInfo.value = data.info ?? {}
    Object.assign(form, normalizeGenInfo(data.info ?? {}))
    columns.value = normalizeGenColumns(data.rows)
    relatedTables.value = Array.isArray(data.tables) ? data.tables : []
    dictOptions.value = Array.isArray(dictResponse.data) ? dictResponse.data : []
    menuTree.value = Array.isArray(menuResponse.data) ? menuResponse.data : []
  }
  catch (error) {
    toast.error('生成配置加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    loading.value = false
  }
}

async function submitForm() {
  if (!access.require(toolGenPerms.edit, '保存生成配置')) {
    return
  }
  if (!validateForm()) {
    return
  }

  submitting.value = true
  try {
    const payload = {
      ...rawInfo.value,
      ...form,
      columns: columns.value,
      params: {
        ...(rawInfo.value.params ?? {}),
        treeCode: form.treeCode,
        treeName: form.treeName,
        treeParentCode: form.treeParentCode,
        parentMenuId: form.parentMenuId,
      },
    }
    await updateGenTable(payload)
    toast.success('生成配置保存成功')
    goBack()
  }
  catch (error) {
    toast.error('生成配置保存失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    submitting.value = false
  }
}

onMounted(loadDetail)
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">系统工具 / 编辑生成配置</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight">{{ pageTitle }}</h1>
    </div>

    <div class="-mx-1 overflow-x-auto surface-scrollbar pb-1">
      <div class="flex w-max min-w-full gap-2 px-1">
        <Button class="shrink-0" :variant="activeTab === 'basic' ? 'default' : 'outline'" @click="activeTab = 'basic'">基础信息</Button>
        <Button class="shrink-0" :variant="activeTab === 'columns' ? 'default' : 'outline'" @click="activeTab = 'columns'">字段信息</Button>
        <Button class="shrink-0" :variant="activeTab === 'gen' ? 'default' : 'outline'" @click="activeTab = 'gen'">生成信息</Button>
      </div>
    </div>

    <AdminSectionCard v-if="activeTab === 'basic'" title="基础信息" description="编辑表和实体信息。">
      <template #headerExtra>
        <Button variant="outline" size="sm" @click="goBack">返回列表</Button>
        <Button v-if="canEditGen" size="sm" :disabled="loading || submitting" @click="submitForm">{{ submitting ? '保存中...' : '保存配置' }}</Button>
      </template>
      <div v-if="loading" class="text-sm text-muted-foreground">正在加载生成配置...</div>
      <div v-else class="grid gap-4 md:grid-cols-2">
        <AdminFormField label="表名称">
          <Input v-model="form.tableName" placeholder="请输入表名称" />
        </AdminFormField>
        <AdminFormField label="表描述">
          <Input v-model="form.tableComment" placeholder="请输入表描述" />
        </AdminFormField>
        <AdminFormField label="实体类名称">
          <Input v-model="form.className" placeholder="请输入实体类名称" />
        </AdminFormField>
        <AdminFormField label="作者">
          <Input v-model="form.functionAuthor" placeholder="请输入作者" />
        </AdminFormField>
        <AdminFormField label="备注" field-class="md:col-span-2">
          <Textarea v-model="form.remark" class="min-h-28 sm:min-h-32" placeholder="请输入备注" />
        </AdminFormField>
      </div>
    </AdminSectionCard>

    <AdminSectionCard v-if="activeTab === 'columns'" title="字段信息" description="编辑字段映射和展示方式。">
      <template #headerExtra>
        <Badge variant="outline">字段 {{ columns.length }} 项</Badge>
        <Badge variant="outline">模板 {{ tplCategoryLabel(form.tplCategory) }}</Badge>
        <Button variant="outline" size="sm" @click="goBack">返回列表</Button>
        <Button v-if="canEditGen" size="sm" :disabled="loading || submitting" @click="submitForm">{{ submitting ? '保存中...' : '保存配置' }}</Button>
      </template>
      <div v-if="loading" class="text-sm text-muted-foreground">正在加载字段配置...</div>
      <div v-else class="overflow-x-auto surface-scrollbar rounded-3xl border border-border/60">
        <table class="min-w-[1480px] text-sm">
          <thead class="bg-muted/40 text-left">
            <tr>
              <th class="px-3 py-3 font-medium">排序</th>
              <th class="px-3 py-3 font-medium">字段列名</th>
              <th class="px-3 py-3 font-medium">字段描述</th>
              <th class="px-3 py-3 font-medium">物理类型</th>
              <th class="px-3 py-3 font-medium">Java 类型</th>
              <th class="px-3 py-3 font-medium">Java 属性</th>
              <th class="px-3 py-3 text-center font-medium">插入</th>
              <th class="px-3 py-3 text-center font-medium">编辑</th>
              <th class="px-3 py-3 text-center font-medium">列表</th>
              <th class="px-3 py-3 text-center font-medium">查询</th>
              <th class="px-3 py-3 font-medium">查询方式</th>
              <th class="px-3 py-3 text-center font-medium">必填</th>
              <th class="px-3 py-3 font-medium">显示类型</th>
              <th class="px-3 py-3 font-medium">字典类型</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="column in columns" :key="column.columnId ?? column.columnName" class="border-t border-border/60 align-top">
              <td class="px-3 py-3">
                <Input v-model="column.sort" class="h-9" type="number" min="1" />
              </td>
              <td class="px-3 py-3 align-middle font-medium">{{ column.columnName || '--' }}</td>
              <td class="px-3 py-3">
                <Input v-model="column.columnComment" class="h-9" placeholder="字段描述" />
              </td>
              <td class="px-3 py-3 align-middle text-muted-foreground">{{ column.columnType || '--' }}</td>
              <td class="px-3 py-3">
                <Select v-model="column.javaType">
                  <SelectTrigger class="h-9"><SelectValue placeholder="Java 类型" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="option in javaTypeOptions" :key="option" :value="option">{{ option }}</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              <td class="px-3 py-3">
                <Input v-model="column.javaField" class="h-9" placeholder="javaField" />
              </td>
              <td class="px-3 py-3 text-center">
                <Checkbox :checked="String(column.isInsert) === '1'" @update:checked="updateFlag(column, 'isInsert', $event)" />
              </td>
              <td class="px-3 py-3 text-center">
                <Checkbox :checked="String(column.isEdit) === '1'" @update:checked="updateFlag(column, 'isEdit', $event)" />
              </td>
              <td class="px-3 py-3 text-center">
                <Checkbox :checked="String(column.isList) === '1'" @update:checked="updateFlag(column, 'isList', $event)" />
              </td>
              <td class="px-3 py-3 text-center">
                <Checkbox :checked="String(column.isQuery) === '1'" @update:checked="updateFlag(column, 'isQuery', $event)" />
              </td>
              <td class="px-3 py-3">
                <Select v-model="column.queryType">
                  <SelectTrigger class="h-9"><SelectValue placeholder="查询方式" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="option in queryTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              <td class="px-3 py-3 text-center">
                <Checkbox :checked="String(column.isRequired) === '1'" @update:checked="updateFlag(column, 'isRequired', $event)" />
              </td>
              <td class="px-3 py-3">
                <Select v-model="column.htmlType">
                  <SelectTrigger class="h-9"><SelectValue placeholder="显示类型" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="option in htmlTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              <td class="px-3 py-3">
                <Select :model-value="column.dictType || '__none__'" @update:model-value="updateDictType(column, $event)">
                  <SelectTrigger class="h-9"><SelectValue placeholder="字典类型" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">无</SelectItem>
                    <SelectItem v-for="dict in dictOptions" :key="dict.dictType" :value="String(dict.dictType)">{{ dict.dictName }} / {{ dict.dictType }}</SelectItem>
                  </SelectContent>
                </Select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AdminSectionCard>

    <AdminSectionCard v-if="activeTab === 'gen'" title="生成信息" description="编辑生成选项。">
      <template #headerExtra>
        <Badge variant="outline">模板 {{ tplCategoryLabel(form.tplCategory) }}</Badge>
        <Button variant="outline" size="sm" @click="goBack">返回列表</Button>
        <Button v-if="canEditGen" size="sm" :disabled="loading || submitting" @click="submitForm">{{ submitting ? '保存中...' : '保存配置' }}</Button>
      </template>
      <div v-if="loading" class="text-sm text-muted-foreground">正在加载生成信息...</div>
      <div v-else class="space-y-6">
        <div class="grid gap-4 md:grid-cols-2">
          <AdminFormField label="生成模板">
            <Select v-model="form.tplCategory" @update:model-value="handleTplCategoryChange">
              <SelectTrigger><SelectValue placeholder="请选择生成模板" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in tplCategoryOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField label="前端类型">
            <Select v-model="form.tplWebType">
              <SelectTrigger><SelectValue placeholder="请选择前端类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in tplWebTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField label="生成包路径">
            <Input v-model="form.packageName" placeholder="例如 com.ruoyi.system" />
          </AdminFormField>
          <AdminFormField label="生成模块名">
            <Input v-model="form.moduleName" placeholder="例如 system" />
          </AdminFormField>
          <AdminFormField label="生成业务名">
            <Input v-model="form.businessName" placeholder="例如 user" />
          </AdminFormField>
          <AdminFormField label="生成功能名">
            <Input v-model="form.functionName" placeholder="例如 用户" />
          </AdminFormField>
          <AdminFormField label="生成方式">
            <Select v-model="form.genType">
              <SelectTrigger><SelectValue placeholder="请选择生成方式" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in genTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField label="上级菜单">
            <Select v-model="form.parentMenuId">
              <SelectTrigger><SelectValue placeholder="请选择上级菜单" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">顶级菜单</SelectItem>
                <SelectItem v-for="menu in menuOptions" :key="menu.id" :value="menu.id">{{ '　'.repeat(menu.depth) }}{{ menu.label }}</SelectItem>
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField v-if="form.genType === '1'" label="自定义路径" field-class="md:col-span-2">
            <Input v-model="form.genPath" placeholder="请输入绝对路径，不填写时默认生成到当前项目目录。" />
          </AdminFormField>
        </div>

        <div v-if="form.tplCategory === 'tree'" class="space-y-4 rounded-3xl border border-border/60 bg-muted/20 p-4 sm:p-5">
          <div>
            <h3 class="text-base font-semibold">树表附加信息</h3>
            <p class="mt-1 text-sm text-muted-foreground">树表需指定编码、名称和父编码字段。</p>
          </div>
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AdminFormField label="树编码字段">
              <Select v-model="form.treeCode">
                <SelectTrigger><SelectValue placeholder="请选择树编码字段" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="option in fieldOptionColumns" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
                </SelectContent>
              </Select>
            </AdminFormField>
            <AdminFormField label="树父编码字段">
              <Select v-model="form.treeParentCode">
                <SelectTrigger><SelectValue placeholder="请选择父编码字段" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="option in fieldOptionColumns" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
                </SelectContent>
              </Select>
            </AdminFormField>
            <AdminFormField label="树名称字段">
              <Select v-model="form.treeName">
                <SelectTrigger><SelectValue placeholder="请选择树名称字段" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="option in fieldOptionColumns" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
                </SelectContent>
              </Select>
            </AdminFormField>
          </div>
        </div>

        <div v-if="form.tplCategory === 'sub'" class="space-y-4 rounded-3xl border border-border/60 bg-muted/20 p-4 sm:p-5">
          <div>
            <h3 class="text-base font-semibold">主子表关联信息</h3>
            <p class="mt-1 text-sm text-muted-foreground">主子表模板需要选择关联子表和外键字段。</p>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <AdminFormField label="关联子表">
              <Select v-model="form.subTableName">
                <SelectTrigger><SelectValue placeholder="请选择关联子表" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="table in relatedTables" :key="table.tableName" :value="String(table.tableName)">{{ table.tableName }} / {{ table.tableComment }}</SelectItem>
                </SelectContent>
              </Select>
            </AdminFormField>
            <AdminFormField label="子表外键字段">
              <Select v-model="form.subTableFkName">
                <SelectTrigger><SelectValue placeholder="请选择外键字段" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="column in relatedSubColumns" :key="column.columnName" :value="String(column.columnName)">{{ column.columnName }} / {{ column.columnComment }}</SelectItem>
                </SelectContent>
              </Select>
            </AdminFormField>
          </div>
        </div>
      </div>
    </AdminSectionCard>
  </div>
</template>




