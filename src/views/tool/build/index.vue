<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import AdminDatePicker from '@/components/admin/AdminDatePicker.vue'
import AdminFormField from '@/components/admin/AdminFormField.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAccess } from '@/lib/access'
import { saveBlob } from '@/lib/download'
import {
  createDefaultBuilderFormMeta,
  getBuilderStudioRecord,
  listBuilderStudioRecords,
  parseBuilderStudioInput,
  readBuilderWorkspace,
  removeBuilderStudioRecord,
  saveBuilderStudioRecord,
  saveBuilderWorkspace,
  serializeBuilderSchema,
  serializeBuilderViewConfig,
  type BuilderStudioRecordSummary,
  type BuilderStudioSnapshot,
} from '@/lib/form-builder-studio'
import {
  builderTemplates,
  createBuilderField,
  createUserFormPreset,
  fieldTypeLabels,
  parseBuilderOptions,
  stringifyBuilderOptions,
  type BuilderField,
  type BuilderFieldType,
} from '@/lib/form-builder'
import { permissionKeys } from '@/lib/permission-keys'

const access = useAccess()
const buildPerms = permissionKeys.tool.build

const activeTab = ref<'design' | 'schema' | 'config'>('design')
const fields = ref<BuilderField[]>([])
const selectedFieldId = ref('')
const previewModel = reactive<Record<string, string | number | boolean>>({})
const importInput = ref<HTMLInputElement | null>(null)
const hydrated = ref(false)
const workspaceUpdatedAt = ref('')
const savedDrafts = ref<BuilderStudioRecordSummary[]>([])

const formMeta = reactive(createDefaultBuilderFormMeta())

const selectedField = computed(() => fields.value.find(item => item.id === selectedFieldId.value) ?? null)
const hasScopedBuildPerms = computed(() => access.hasAnyPrefix(buildPerms.scope))
const canEditBuilder = computed(() => !hasScopedBuildPerms.value || access.can(buildPerms.edit))
const canImportBuilder = computed(() => !hasScopedBuildPerms.value || access.can([...buildPerms.import, ...buildPerms.edit]))
const canExportBuilder = computed(() => !hasScopedBuildPerms.value || access.can([...buildPerms.export, ...buildPerms.edit]))
const buildReadonly = computed(() => hasScopedBuildPerms.value && !canEditBuilder.value)

const readonlyTips = computed(() => {
  if (!buildReadonly.value) {
    return ''
  }
  return canExportBuilder.value
    ? '仅可查看和导出。'
    : '仅可查看。'
})

const duplicateProps = computed(() => {
  const counts = new Map<string, number>()
  for (const field of fields.value) {
    const key = field.prop.trim()
    if (!key) {
      continue
    }
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([key]) => key))
})

const schemaJson = computed(() => JSON.stringify(serializeBuilderSchema(formMeta, fields.value), null, 2))
const viewConfigJson = computed(() => JSON.stringify(serializeBuilderViewConfig(formMeta, fields.value), null, 2))
const canvasGridClass = computed(() => formMeta.columns === '1' ? 'grid gap-4' : 'grid gap-4 md:grid-cols-2')

const statCards = computed(() => [
  { label: '组件模板', value: String(builderTemplates.length), tip: '常用组件。' },
  { label: '当前字段', value: String(fields.value.length), tip: '字段数量。' },
  {
    label: '已保存草稿',
    value: String(savedDrafts.value.length),
    tip: workspaceUpdatedAt.value ? `最近保存：${workspaceUpdatedAt.value}` : '会自动保存。',
  },
  { label: '输出产物', value: '结构/配置', tip: '可复制或导出。' },
])

const healthTips = computed(() => {
  const tips: string[] = []
  if (!fields.value.length) {
    tips.push('先添加组件。')
  }
  if (duplicateProps.value.size) {
    tips.push(`标识重复：${Array.from(duplicateProps.value).join('、')}`)
  }
  if (fields.value.some(field => !field.label.trim() || !field.prop.trim())) {
    tips.push('部分字段未填。')
  }
  if (!tips.length) {
    tips.push('结构可用。')
  }
  return tips
})

const selectedOptionsText = computed({
  get() {
    return stringifyBuilderOptions(selectedField.value?.options ?? [])
  },
  set(value: string) {
    if (!selectedField.value || !canEditBuilder.value) {
      return
    }
    selectedField.value.options = parseBuilderOptions(value)
  },
})

function ensureCapability(allowed: boolean, actionLabel: string) {
  if (allowed) {
    return true
  }
  toast.error('无权限', {
    description: `您没有${actionLabel}权限。`,
  })
  return false
}

function ensureBuilderEdit(actionLabel: string) {
  return ensureCapability(canEditBuilder.value, actionLabel)
}

function ensureBuilderImport(actionLabel: string) {
  return ensureCapability(canImportBuilder.value, actionLabel)
}

function ensureBuilderExport(actionLabel: string) {
  return ensureCapability(canExportBuilder.value, actionLabel)
}

watch(fields, () => {
  if (!fields.value.some(item => item.id === selectedFieldId.value)) {
    selectedFieldId.value = fields.value[0]?.id ?? ''
  }
  syncPreviewModel()
}, { deep: true, immediate: true })

watch(() => ({
  title: formMeta.title,
  description: formMeta.description,
  columns: formMeta.columns,
  fields: fields.value,
}), () => {
  if (!hydrated.value || !canEditBuilder.value) {
    return
  }
  workspaceUpdatedAt.value = saveBuilderWorkspace(snapshotState())
}, { deep: true })

function cloneFields(source: BuilderField[]) {
  return source.map(field => ({
    ...field,
    options: field.options.map(option => ({ ...option })),
  }))
}

function snapshotState(): BuilderStudioSnapshot {
  return {
    meta: {
      title: formMeta.title,
      description: formMeta.description,
      columns: formMeta.columns === '1' ? '1' : '2',
    },
    fields: cloneFields(fields.value),
  }
}

function applySnapshot(snapshot: BuilderStudioSnapshot) {
  formMeta.title = snapshot.meta.title
  formMeta.description = snapshot.meta.description
  formMeta.columns = snapshot.meta.columns === '1' ? '1' : '2'
  fields.value = cloneFields(snapshot.fields)
  selectedFieldId.value = fields.value[0]?.id ?? ''
  activeTab.value = 'design'
}

function refreshDrafts() {
  savedDrafts.value = listBuilderStudioRecords()
}

function modelKey(field: BuilderField) {
  return field.prop.trim() || field.id
}

function syncPreviewModel() {
  const previous = { ...previewModel }
  for (const key of Object.keys(previewModel)) {
    delete previewModel[key]
  }
  for (const field of fields.value) {
    const key = modelKey(field)
    previewModel[key] = previous[key] ?? field.defaultValue
  }
}

function fieldSpanClass(field: BuilderField) {
  return formMeta.columns === '2' && field.span === 'full' ? 'md:col-span-2' : ''
}

function addField(type: BuilderFieldType) {
  if (!ensureBuilderEdit('编辑')) {
    return
  }
  const index = fields.value.filter(item => item.type === type).length + 1
  const field = createBuilderField(type, index)
  fields.value.push(field)
  selectedFieldId.value = field.id
  toast.success(`已加入${fieldTypeLabels[type]}`)
}

function loadPreset(silent = false, enforcePermission = true) {
  if (enforcePermission && !ensureBuilderEdit('编辑')) {
    return
  }
  applySnapshot({
    meta: createDefaultBuilderFormMeta(),
    fields: createUserFormPreset(),
  })
  if (!silent) {
    toast.success('已载入')
  }
}

function clearCanvas() {
  if (!ensureBuilderEdit('清空画布')) {
    return
  }
  fields.value = []
  selectedFieldId.value = ''
  toast.success('画布已清空')
}

function removeField(id: string) {
  if (!ensureBuilderEdit('编辑')) {
    return
  }
  fields.value = fields.value.filter(item => item.id !== id)
  if (!fields.value.length) {
    selectedFieldId.value = ''
  }
  toast.success('字段已移除')
}

function duplicateField(id: string) {
  if (!ensureBuilderEdit('编辑')) {
    return
  }
  const index = fields.value.findIndex(item => item.id === id)
  if (index < 0) {
    return
  }
  const source = fields.value[index]
  const seed = createBuilderField(source.type, fields.value.filter(item => item.type === source.type).length + 1)
  const copyField: BuilderField = {
    ...source,
    id: seed.id,
    label: `${source.label}副本`,
    prop: `${source.prop}Copy`,
    options: source.options.map(option => ({ ...option })),
  }
  fields.value.splice(index + 1, 0, copyField)
  selectedFieldId.value = copyField.id
  toast.success('字段已复制')
}

function moveField(id: string, step: number) {
  if (!ensureBuilderEdit('编辑')) {
    return
  }
  const index = fields.value.findIndex(item => item.id === id)
  const nextIndex = index + step
  if (index < 0 || nextIndex < 0 || nextIndex >= fields.value.length) {
    return
  }
  const [field] = fields.value.splice(index, 1)
  fields.value.splice(nextIndex, 0, field)
  selectedFieldId.value = field.id
}

function updatePreviewValue(field: BuilderField, value: string | number | boolean) {
  previewModel[modelKey(field)] = value
}

function updateSelectPreviewValue(field: BuilderField, value: unknown) {
  if (value == null) {
    previewModel[modelKey(field)] = ''
    return
  }
  if (typeof value === 'bigint') {
    previewModel[modelKey(field)] = value.toString()
    return
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    previewModel[modelKey(field)] = value
    return
  }
  previewModel[modelKey(field)] = String(value)
}

function updateSelectedRequired(value: boolean | 'indeterminate') {
  if (!selectedField.value || !canEditBuilder.value) {
    return
  }
  selectedField.value.required = Boolean(value)
}

function isDuplicateProp(field: BuilderField) {
  const key = field.prop.trim()
  return Boolean(key) && duplicateProps.value.has(key)
}

async function copyText(text: string, successMessage: string) {
  if (!ensureBuilderExport('导出')) {
    return
  }
  const clipboard = globalThis.navigator?.clipboard
  if (!clipboard) {
    toast.error('当前环境不支持剪贴板写入')
    return
  }

  try {
    await clipboard.writeText(text)
    toast.success(successMessage)
  }
  catch (error) {
    toast.error('复制失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
}

function sanitizeFileName(input: string) {
  const trimmed = input.trim() || 'form-builder'
  return trimmed.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-')
}

function exportJson(text: string, suffix: string) {
  if (!ensureBuilderExport('导出')) {
    return
  }
  const fileName = `${sanitizeFileName(formMeta.title)}.${suffix}.json`
  saveBlob(new Blob([text], { type: 'application/json;charset=utf-8' }), fileName)
  toast.success('文件已开始下载')
}

function triggerImport() {
  if (!ensureBuilderImport('导入')) {
    return
  }
  importInput.value?.click()
}

async function handleImportFile(event: Event) {
  if (!ensureBuilderImport('导入')) {
    return
  }
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }

  try {
    const text = await file.text()
    const snapshot = parseBuilderStudioInput(text)
    applySnapshot(snapshot)
    toast.success('JSON 已导入')
  }
  catch (error) {
    toast.error('JSON 导入失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    input.value = ''
  }
}

function handleSaveDraft() {
  if (!ensureBuilderEdit('保存表单草稿')) {
    return
  }
  const record = saveBuilderStudioRecord(formMeta.title, snapshotState())
  refreshDrafts()
  toast.success(`已保存草稿：${record.name}`)
}

function handleLoadDraft(recordId: string) {
  if (!ensureBuilderEdit('载入表单草稿')) {
    return
  }
  const record = getBuilderStudioRecord(recordId)
  if (!record) {
    toast.error('找不到指定草稿')
    refreshDrafts()
    return
  }
  applySnapshot(record.snapshot)
  toast.success(`已载入草稿：${record.name}`)
}

function handleDeleteDraft(recordId: string) {
  if (!ensureBuilderEdit('删除表单草稿')) {
    return
  }
  removeBuilderStudioRecord(recordId)
  refreshDrafts()
  toast.success('草稿已删除')
}

function handleRestoreWorkspace() {
  if (!ensureBuilderEdit('恢复工作草稿')) {
    return
  }
  const workspace = readBuilderWorkspace()
  if (!workspace) {
    toast.warning('当前没有可恢复的工作草稿')
    return
  }
  applySnapshot(workspace.snapshot)
  workspaceUpdatedAt.value = workspace.updatedAt
  toast.success('已恢复工作草稿')
}

onMounted(() => {
  refreshDrafts()
  const workspace = readBuilderWorkspace()
  if (workspace) {
    applySnapshot(workspace.snapshot)
    workspaceUpdatedAt.value = workspace.updatedAt
  }
  else {
    loadPreset(true, false)
    workspaceUpdatedAt.value = canEditBuilder.value ? saveBuilderWorkspace(snapshotState()) : ''
  }
  hydrated.value = true
})
</script>

<template>
  <div class="space-y-6">
    <input ref="importInput" class="hidden" type="file" accept="application/json,.json" @change="handleImportFile" />

    <div>
      <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">系统工具 / 表单构建</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight">表单构建</h1>
    </div>

    <div v-if="buildReadonly" class="rounded-3xl border border-amber-300/60 bg-amber-50/80 px-5 py-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
      {{ readonlyTips }}
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="item in statCards" :key="item.label" class="rounded-3xl border border-white/60 bg-white/75 px-5 py-5 dark:border-white/10 dark:bg-white/5">
        <p class="text-sm text-muted-foreground">{{ item.label }}</p>
        <p class="mt-3 text-3xl font-semibold tracking-tight">{{ item.value }}</p>
        <p class="mt-2 text-sm text-muted-foreground">{{ item.tip }}</p>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_360px]">
      <AdminSectionCard title="组件面板" description="添加组件。" content-class="space-y-3">
        <template #headerExtra>
          <Button v-if="canImportBuilder" variant="outline" size="sm" @click="triggerImport">JSON 导入</Button>
          <Button v-if="canEditBuilder" variant="outline" size="sm" @click="loadPreset()">载入示例</Button>
          <Button v-if="canEditBuilder" size="sm" @click="clearCanvas">清空画布</Button>
        </template>
        <button
          v-for="item in builderTemplates"
          :key="item.type"
          class="w-full rounded-3xl border border-border/60 bg-muted/15 p-4 text-left transition hover:border-border hover:bg-muted/25 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          :disabled="!canEditBuilder"
          @click="addField(item.type)"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div class="flex items-center gap-2">
                <p class="font-medium">{{ item.title }}</p>
                <Badge variant="outline">{{ item.category }}</Badge>
              </div>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">{{ item.description }}</p>
            </div>
            <Badge variant="secondary">添加</Badge>
          </div>
        </button>
      </AdminSectionCard>

      <Tabs v-model:model-value="activeTab" class="space-y-4">
        <div class="-mx-1 overflow-x-auto surface-scrollbar pb-1">
          <TabsList class="flex w-max min-w-full bg-muted/50 p-1 sm:w-fit">
            <TabsTrigger value="design">设计画布</TabsTrigger>
            <TabsTrigger value="schema">结构</TabsTrigger>
            <TabsTrigger value="config">配置</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="design" class="mt-0 space-y-6">
          <AdminSectionCard title="表单信息" description="基础设置。">
            <div class="grid gap-4 md:grid-cols-2">
              <AdminFormField label="表单标题">
                <Input v-model="formMeta.title" placeholder="请输入表单标题" :disabled="buildReadonly" />
              </AdminFormField>
              <AdminFormField label="预览列数">
                <Select v-model="formMeta.columns" :disabled="buildReadonly">
                  <SelectTrigger><SelectValue placeholder="请选择列数" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">单列布局</SelectItem>
                    <SelectItem value="2">双列布局</SelectItem>
                  </SelectContent>
                </Select>
              </AdminFormField>
              <AdminFormField label="表单说明" field-class="md:col-span-2">
                <Textarea v-model="formMeta.description" class="min-h-24 sm:min-h-28" placeholder="请输入表单说明" :disabled="buildReadonly" />
              </AdminFormField>
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="画布" description="拖拽调整。" content-class="space-y-4">
            <div v-if="fields.length" class="space-y-3">
              <button
                v-for="(field, index) in fields"
                :key="field.id"
                class="w-full rounded-3xl border p-4 text-left transition"
                :class="selectedFieldId === field.id ? 'border-foreground/40 bg-muted/25 shadow-sm' : 'border-border/60 bg-muted/10 hover:border-border hover:bg-muted/20'"
                type="button"
                @click="selectedFieldId = field.id"
              >
                <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div class="space-y-2">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="text-base font-semibold">{{ field.label || '未命名字段' }}</p>
                      <Badge variant="outline">{{ fieldTypeLabels[field.type] }}</Badge>
                      <Badge v-if="field.required" variant="secondary">必填</Badge>
                      <Badge v-if="isDuplicateProp(field)" variant="destructive">标识重复</Badge>
                    </div>
                    <p class="text-sm text-muted-foreground">标识：{{ field.prop || '--' }}</p>
                    <p class="text-sm leading-6 text-muted-foreground">{{ field.hint || '暂无备注。' }}</p>
                  </div>
                  <div class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" @click.stop>
                    <Button size="sm" variant="outline" class="w-full sm:w-auto" :disabled="!canEditBuilder || index === 0" @click="moveField(field.id, -1)">上移</Button>
                    <Button size="sm" variant="outline" class="w-full sm:w-auto" :disabled="!canEditBuilder || index === fields.length - 1" @click="moveField(field.id, 1)">下移</Button>
                    <Button size="sm" variant="outline" class="w-full sm:w-auto" :disabled="!canEditBuilder" @click="duplicateField(field.id)">复制</Button>
                    <Button size="sm" variant="destructive" class="w-full sm:w-auto" :disabled="!canEditBuilder" @click="removeField(field.id)">删除</Button>
                  </div>
                </div>
              </button>
            </div>
            <div v-else class="rounded-3xl border border-dashed border-border/70 bg-muted/10 px-6 py-12 text-center text-sm text-muted-foreground">
              先添加组件。
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="实时预览" :description="formMeta.description || '表单预览。'">
            <div :class="canvasGridClass">
              <AdminFormField v-for="field in fields" :key="field.id" :label="field.label || '未命名字段'" :field-class="fieldSpanClass(field)">
                <Input
                  v-if="field.type === 'input' || field.type === 'phone' || field.type === 'email'"
                  :model-value="String(previewModel[modelKey(field)] ?? '')"
                  :placeholder="field.placeholder"
                  :type="field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'"
                  @update:model-value="(value) => updatePreviewValue(field, value)"
                />
                <AdminDatePicker
                  v-else-if="field.type === 'date'"
                  :model-value="String(previewModel[modelKey(field)] ?? '')"
                  :placeholder="field.placeholder || '请选择日期'"
                  @update:model-value="(value) => updatePreviewValue(field, value)"
                />
                <Textarea
                  v-else-if="field.type === 'textarea'"
                  :model-value="String(previewModel[modelKey(field)] ?? '')"
                  class="min-h-28"
                  :placeholder="field.placeholder"
                  @update:model-value="(value) => updatePreviewValue(field, value)"
                />
                <Select
                  v-else-if="field.type === 'select'"
                  :model-value="String(previewModel[modelKey(field)] ?? '')"
                  @update:model-value="(value) => updateSelectPreviewValue(field, value)"
                >
                  <SelectTrigger><SelectValue :placeholder="field.placeholder || '请选择'" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="option in field.options" :key="`${field.id}-${option.value}`" :value="option.value">{{ option.label }}</SelectItem>
                  </SelectContent>
                </Select>
                <div v-else class="flex min-h-11 items-center rounded-2xl border border-border/60 bg-muted/15 px-4">
                  <Switch :model-value="Boolean(previewModel[modelKey(field)])" @update:model-value="(value) => updatePreviewValue(field, Boolean(value))" />
                  <span class="ml-3 text-sm text-muted-foreground">{{ Boolean(previewModel[modelKey(field)]) ? '开启' : '关闭' }}</span>
                </div>
                <p v-if="field.hint" class="mt-2 text-xs text-muted-foreground">{{ field.hint }}</p>
              </AdminFormField>
            </div>
          </AdminSectionCard>
        </TabsContent>

        <TabsContent value="schema" class="mt-0">
          <AdminSectionCard title="结构" description="实时生成。">
            <template #headerExtra>
              <Button v-if="canExportBuilder" variant="outline" size="sm" class="w-full sm:w-auto" @click="copyText(schemaJson, '结构已复制到剪贴板')">复制结构</Button>
              <Button v-if="canExportBuilder" size="sm" class="w-full sm:w-auto" @click="exportJson(schemaJson, 'schema')">导出结构</Button>
            </template>
            <div class="rounded-3xl border border-border/60 bg-zinc-950 px-5 py-5 font-mono text-xs leading-6 text-zinc-100">
              <pre class="overflow-x-auto surface-scrollbar whitespace-pre-wrap">{{ schemaJson }}</pre>
            </div>
          </AdminSectionCard>
        </TabsContent>

        <TabsContent value="config" class="mt-0">
          <AdminSectionCard title="配置" description="字段规则。">
            <template #headerExtra>
              <Button v-if="canExportBuilder" variant="outline" size="sm" class="w-full sm:w-auto" @click="copyText(viewConfigJson, '配置已复制到剪贴板')">复制配置</Button>
              <Button v-if="canExportBuilder" size="sm" class="w-full sm:w-auto" @click="exportJson(viewConfigJson, 'view-config')">导出配置</Button>
            </template>
            <div class="rounded-3xl border border-border/60 bg-zinc-950 px-5 py-5 font-mono text-xs leading-6 text-zinc-100">
              <pre class="overflow-x-auto surface-scrollbar whitespace-pre-wrap">{{ viewConfigJson }}</pre>
            </div>
          </AdminSectionCard>
        </TabsContent>
      </Tabs>

      <div class="space-y-6">
        <AdminSectionCard title="字段属性" description="属性设置。">
          <div v-if="selectedField" class="space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{{ fieldTypeLabels[selectedField.type] }}</Badge>
              <Badge v-if="selectedField.span === 'full'" variant="secondary">整行显示</Badge>
              <Badge v-if="selectedField.required" variant="secondary">必填</Badge>
            </div>

            <div class="grid gap-4">
              <AdminFormField label="标签">
                <Input v-model="selectedField.label" placeholder="请输入标签" :disabled="buildReadonly" />
              </AdminFormField>
              <AdminFormField label="标识">
                <Input v-model="selectedField.prop" placeholder="请输入标识" :disabled="buildReadonly" />
              </AdminFormField>
              <AdminFormField label="占位">
                <Input v-model="selectedField.placeholder" placeholder="请输入占位" :disabled="buildReadonly" />
              </AdminFormField>
              <AdminFormField label="说明">
                <Textarea v-model="selectedField.hint" class="min-h-24 sm:min-h-28" placeholder="请输入说明" :disabled="buildReadonly" />
              </AdminFormField>
              <AdminFormField label="布局宽度">
                <Select v-model="selectedField.span" :disabled="buildReadonly">
                  <SelectTrigger><SelectValue placeholder="请选择宽度" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="half">半宽</SelectItem>
                    <SelectItem value="full">整行</SelectItem>
                  </SelectContent>
                </Select>
              </AdminFormField>
              <div class="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="text-sm font-medium">是否必填</p>
                  <p class="mt-1 text-xs text-muted-foreground">可选。</p>
                </div>
                <Switch :model-value="selectedField.required" :disabled="buildReadonly" @update:model-value="updateSelectedRequired" />
              </div>
              <AdminFormField v-if="selectedField.type === 'select'" label="下拉选项">
                <Textarea v-model="selectedOptionsText" class="min-h-32 font-mono text-xs" placeholder="一行一个选项，格式：标签:值" :disabled="buildReadonly" />
              </AdminFormField>
            </div>
          </div>
          <div v-else class="rounded-3xl border border-dashed border-border/70 bg-muted/10 px-5 py-10 text-center text-sm text-muted-foreground">
            先在中间画布里选中一个字段，再编辑属性。
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="草稿管理" description="自动保存。" content-class="space-y-3">
          <div class="rounded-3xl border border-border/60 bg-muted/15 px-4 py-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="font-medium">工作草稿</p>
                <p class="mt-2 text-sm text-muted-foreground">{{ workspaceUpdatedAt ? `最近保存：${workspaceUpdatedAt}` : '尚无草稿' }}</p>
                <p class="mt-1 text-xs text-muted-foreground">已保存版本数：{{ savedDrafts.length }}</p>
              </div>
              <Badge variant="outline">自动保存</Badge>
            </div>
            <div v-if="canEditBuilder" class="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Button variant="outline" size="sm" class="w-full sm:w-auto" @click="handleRestoreWorkspace">恢复工作草稿</Button>
              <Button size="sm" class="w-full sm:w-auto" @click="handleSaveDraft">保存当前版本</Button>
            </div>
          </div>

          <div v-if="savedDrafts.length" class="space-y-3">
            <div v-for="draft in savedDrafts" :key="draft.id" class="rounded-3xl border border-border/60 bg-muted/10 px-4 py-4">
              <div class="space-y-1">
                <p class="font-medium">{{ draft.name }}</p>
                <p class="text-xs text-muted-foreground">{{ draft.updatedAt }}</p>
                <p class="text-xs text-muted-foreground">{{ draft.title || '--' }} / {{ draft.fieldCount }} 个字段</p>
              </div>
              <div v-if="canEditBuilder" class="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <Button size="sm" variant="outline" class="w-full sm:w-auto" @click="handleLoadDraft(draft.id)">载入</Button>
                <Button size="sm" variant="destructive" class="w-full sm:w-auto" @click="handleDeleteDraft(draft.id)">删除</Button>
              </div>
            </div>
          </div>
          <div v-else class="rounded-3xl border border-dashed border-border/70 bg-muted/10 px-5 py-8 text-center text-sm text-muted-foreground">
            暂无草稿。
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="结构校验" description="导出检查。" content-class="space-y-3">
          <div v-for="tip in healthTips" :key="tip" class="rounded-2xl border border-border/60 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
            {{ tip }}
          </div>
        </AdminSectionCard>
      </div>
    </div>
  </div>
</template>



















