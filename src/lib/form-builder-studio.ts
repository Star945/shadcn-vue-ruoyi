import { createBuilderField, type BuilderField } from '@/lib/form-builder'

export interface BuilderFormMeta {
  title: string
  description: string
  columns: '1' | '2'
}

export interface BuilderSchemaOutput {
  form: {
    title: string
    description: string
    columns: number
  }
  fields: Array<Omit<BuilderField, 'id'>>
}

export interface BuilderViewConfigRule {
  type: 'required' | 'email' | 'pattern'
  trigger: 'blur' | 'change'
  message: string
  pattern?: string
}

export interface BuilderViewConfigImport {
  name: string
  from: string
}

export interface BuilderViewConfigOutput {
  form: {
    title: string
    description: string
    columns: number
  }
  imports: BuilderViewConfigImport[]
  components: Array<{
    label: string
    prop: string
    type: BuilderField['type']
    component: string
    required: boolean
    span: BuilderField['span']
    hint: string
    defaultValue: string | boolean
    componentProps: Record<string, unknown>
    rules: BuilderViewConfigRule[]
    options?: Array<{ label: string, value: string }>
  }>
}

export interface BuilderStudioSnapshot {
  meta: BuilderFormMeta
  fields: BuilderField[]
}

export interface BuilderStudioRecord {
  id: string
  name: string
  updatedAt: string
  snapshot: BuilderStudioSnapshot
}

export interface BuilderStudioRecordSummary {
  id: string
  name: string
  updatedAt: string
  fieldCount: number
  title: string
}

interface BuilderStudioStorage {
  workspace?: {
    updatedAt: string
    snapshot: BuilderStudioSnapshot
  }
  records: BuilderStudioRecord[]
}

const storageKey = 'ruoyi-shadcn-form-builder-studio'
const fieldTypes = ['input', 'textarea', 'select', 'switch', 'date', 'phone', 'email'] as const
const fieldSpans = ['half', 'full'] as const
const componentImportMap = {
  Input: '@/components/ui/input',
  Textarea: '@/components/ui/textarea',
  Select: '@/components/ui/select',
  Switch: '@/components/ui/switch',
  AdminDatePicker: '@/components/admin/AdminDatePicker.vue',
} as const

type BuilderComponentName = keyof typeof componentImportMap

export function createDefaultBuilderFormMeta(): BuilderFormMeta {
  return {
    title: '用户资料表单',
    description: '用于系统管理资料录入的示例 schema，可继续扩展为真实表单设计器。',
    columns: '2',
  }
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function cloneField(field: BuilderField): BuilderField {
  return {
    ...field,
    options: field.options.map(option => ({ ...option })),
  }
}

function cloneSnapshot(snapshot: BuilderStudioSnapshot): BuilderStudioSnapshot {
  return {
    meta: { ...snapshot.meta },
    fields: snapshot.fields.map(cloneField),
  }
}

function toStorageTime(value?: Date) {
  return (value ?? new Date()).toLocaleString('zh-CN', { hour12: false })
}

function parseStorage() {
  if (typeof window === 'undefined') {
    return { records: [] } satisfies BuilderStudioStorage
  }

  const raw = window.localStorage.getItem(storageKey)
  if (!raw) {
    return { records: [] } satisfies BuilderStudioStorage
  }

  try {
    const parsed = JSON.parse(raw) as Partial<BuilderStudioStorage>
    return {
      workspace: parsed.workspace && parsed.workspace.snapshot
        ? {
            updatedAt: typeof parsed.workspace.updatedAt === 'string' ? parsed.workspace.updatedAt : toStorageTime(),
            snapshot: normalizeSnapshot(parsed.workspace.snapshot),
          }
        : undefined,
      records: Array.isArray(parsed.records)
        ? parsed.records
            .map((record) => {
              if (!record || typeof record !== 'object') {
                return null
              }
              return {
                id: typeof record.id === 'string' ? record.id : createId('draft'),
                name: typeof record.name === 'string' && record.name.trim() ? record.name.trim() : '未命名草稿',
                updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : toStorageTime(),
                snapshot: normalizeSnapshot(record.snapshot),
              } satisfies BuilderStudioRecord
            })
            .filter((record): record is BuilderStudioRecord => Boolean(record))
        : [],
    } satisfies BuilderStudioStorage
  }
  catch {
    window.localStorage.removeItem(storageKey)
    return { records: [] } satisfies BuilderStudioStorage
  }
}

function writeStorage(storage: BuilderStudioStorage) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(storageKey, JSON.stringify(storage))
}

function normalizeString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function normalizeOptions(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((option) => {
      if (!option || typeof option !== 'object') {
        return null
      }
      const label = normalizeString(option.label).trim()
      const rawValue = normalizeString(option.value).trim()
      const normalizedValue = rawValue || label
      return normalizedValue
        ? {
            label: label || normalizedValue,
            value: normalizedValue,
          }
        : null
    })
    .filter((option): option is { label: string, value: string } => Boolean(option))
}

function normalizeField(rawField: unknown, index: number) {
  const source = rawField && typeof rawField === 'object' ? rawField as Partial<BuilderField> : {}
  const type = fieldTypes.includes(source.type as BuilderField['type']) ? source.type as BuilderField['type'] : 'input'
  const base = createBuilderField(type, index + 1)

  return {
    ...base,
    id: typeof source.id === 'string' && source.id.trim() ? source.id : createId(type),
    label: normalizeString(source.label, base.label),
    prop: normalizeString(source.prop, base.prop),
    placeholder: normalizeString(source.placeholder, base.placeholder),
    required: Boolean(source.required),
    span: fieldSpans.includes(source.span as BuilderField['span']) ? source.span as BuilderField['span'] : base.span,
    hint: normalizeString(source.hint, base.hint),
    defaultValue: type === 'switch' ? Boolean(source.defaultValue) : normalizeString(source.defaultValue, normalizeString(base.defaultValue)),
    options: type === 'select' ? normalizeOptions(source.options) : [],
  } satisfies BuilderField
}

export function normalizeSnapshot(input: unknown): BuilderStudioSnapshot {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  const rawMeta = source.meta && typeof source.meta === 'object'
    ? source.meta as Record<string, unknown>
    : source.form && typeof source.form === 'object'
      ? source.form as Record<string, unknown>
      : {}

  const meta: BuilderFormMeta = {
    title: normalizeString(rawMeta.title, createDefaultBuilderFormMeta().title),
    description: normalizeString(rawMeta.description, createDefaultBuilderFormMeta().description),
    columns: String(rawMeta.columns) === '1' ? '1' : '2',
  }

  const rawFields = Array.isArray(source.fields) ? source.fields : []
  return {
    meta,
    fields: rawFields.map((field, index) => normalizeField(field, index)),
  }
}

export function serializeBuilderSchema(meta: BuilderFormMeta, fields: BuilderField[]): BuilderSchemaOutput {
  return {
    form: {
      title: meta.title,
      description: meta.description,
      columns: Number(meta.columns),
    },
    fields: fields.map(({ id, ...field }) => ({
      ...field,
      options: field.options.map(option => ({ ...option })),
    })),
  }
}

function componentNameOf(field: BuilderField): BuilderComponentName {
  if (field.type === 'textarea') return 'Textarea'
  if (field.type === 'select') return 'Select'
  if (field.type === 'switch') return 'Switch'
  if (field.type === 'date') return 'AdminDatePicker'
  return 'Input'
}

function componentPropsOf(field: BuilderField) {
  if (field.type === 'switch') {
    return {}
  }

  if (field.type === 'select') {
    return {
      placeholder: field.placeholder || '请选择',
    }
  }

  if (field.type === 'date') {
    return {
      placeholder: field.placeholder || '请选择日期',
    }
  }

  return {
    placeholder: field.placeholder,
    type: field.type === 'email'
      ? 'email'
      : field.type === 'phone'
        ? 'tel'
        : 'text',
  }
}

function requiredMessageOf(field: BuilderField) {
  if (field.type === 'select' || field.type === 'date') {
    return `请选择${field.label}`
  }

  if (field.type === 'switch') {
    return `请设置${field.label}`
  }

  return `请输入${field.label}`
}

function rulesOf(field: BuilderField): BuilderViewConfigRule[] {
  const rules: BuilderViewConfigRule[] = []
  const changeTrigger = field.type === 'select' || field.type === 'switch' || field.type === 'date'

  if (field.required) {
    rules.push({
      type: 'required',
      trigger: changeTrigger ? 'change' : 'blur',
      message: requiredMessageOf(field),
    })
  }

  if (field.type === 'email') {
    rules.push({
      type: 'email',
      trigger: 'blur',
      message: '请输入正确的邮箱地址',
    })
  }

  if (field.type === 'phone') {
    rules.push({
      type: 'pattern',
      trigger: 'blur',
      message: '请输入正确的手机号码',
      pattern: '^1[3-9]\\d{9}$',
    })
  }

  return rules
}

function collectImports(fields: BuilderField[]): BuilderViewConfigImport[] {
  const names = Array.from(new Set(fields.map(field => componentNameOf(field))))
  return names.map(name => ({
    name,
    from: componentImportMap[name],
  }))
}

export function serializeBuilderViewConfig(meta: BuilderFormMeta, fields: BuilderField[]): BuilderViewConfigOutput {
  return {
    form: {
      title: meta.title,
      description: meta.description,
      columns: Number(meta.columns),
    },
    imports: collectImports(fields),
    components: fields.map(field => ({
      label: field.label,
      prop: field.prop,
      type: field.type,
      component: componentNameOf(field),
      required: field.required,
      span: field.span,
      hint: field.hint,
      defaultValue: field.defaultValue,
      componentProps: componentPropsOf(field),
      rules: rulesOf(field),
      options: field.type === 'select'
        ? field.options.map(option => ({ ...option }))
        : undefined,
    })),
  }
}

export function parseBuilderStudioInput(rawInput: string) {
  const parsed = JSON.parse(rawInput) as unknown
  return normalizeSnapshot(parsed)
}

export function readBuilderWorkspace() {
  const storage = parseStorage()
  if (!storage.workspace) {
    return null
  }
  return {
    updatedAt: storage.workspace.updatedAt,
    snapshot: cloneSnapshot(storage.workspace.snapshot),
  }
}

export function saveBuilderWorkspace(snapshot: BuilderStudioSnapshot) {
  const storage = parseStorage()
  const updatedAt = toStorageTime()
  storage.workspace = {
    updatedAt,
    snapshot: cloneSnapshot(snapshot),
  }
  writeStorage(storage)
  return updatedAt
}

export function listBuilderStudioRecords() {
  const storage = parseStorage()
  return storage.records.map(record => ({
    id: record.id,
    name: record.name,
    updatedAt: record.updatedAt,
    fieldCount: record.snapshot.fields.length,
    title: record.snapshot.meta.title,
  })) satisfies BuilderStudioRecordSummary[]
}

export function saveBuilderStudioRecord(name: string, snapshot: BuilderStudioSnapshot) {
  const storage = parseStorage()
  const updatedAt = toStorageTime()
  const record: BuilderStudioRecord = {
    id: createId('draft'),
    name: name.trim() || snapshot.meta.title.trim() || '未命名草稿',
    updatedAt,
    snapshot: cloneSnapshot(snapshot),
  }
  storage.records = [record, ...storage.records].slice(0, 20)
  writeStorage(storage)
  return record
}

export function getBuilderStudioRecord(recordId: string) {
  const storage = parseStorage()
  const record = storage.records.find(item => item.id === recordId)
  if (!record) {
    return null
  }
  return {
    ...record,
    snapshot: cloneSnapshot(record.snapshot),
  }
}

export function removeBuilderStudioRecord(recordId: string) {
  const storage = parseStorage()
  storage.records = storage.records.filter(item => item.id !== recordId)
  writeStorage(storage)
}
