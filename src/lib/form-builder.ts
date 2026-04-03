export type BuilderFieldType = 'input' | 'textarea' | 'select' | 'switch' | 'date' | 'phone' | 'email'
export type BuilderFieldSpan = 'half' | 'full'

export interface BuilderOption {
  label: string
  value: string
}

export interface BuilderField {
  id: string
  type: BuilderFieldType
  label: string
  prop: string
  placeholder: string
  required: boolean
  span: BuilderFieldSpan
  hint: string
  defaultValue: string | boolean
  options: BuilderOption[]
}

export interface BuilderTemplate {
  type: BuilderFieldType
  title: string
  description: string
  category: string
  field: Omit<BuilderField, 'id'>
}

export const fieldTypeLabels: Record<BuilderFieldType, string> = {
  input: '输入框',
  textarea: '文本域',
  select: '下拉框',
  switch: '开关',
  date: '日期',
  phone: '手机号',
  email: '邮箱',
}

export const builderTemplates: BuilderTemplate[] = [
  {
    type: 'input',
    title: '单行文本',
    description: '适合昵称、编码、短文本等常见字段。',
    category: '输入类',
    field: {
      type: 'input',
      label: '文本字段',
      prop: 'textField',
      placeholder: '请输入内容',
      required: false,
      span: 'half',
      hint: '适合常见短文本录入。',
      defaultValue: '',
      options: [],
    },
  },
  {
    type: 'textarea',
    title: '多行文本',
    description: '适合备注、说明、审批意见等长文本字段。',
    category: '输入类',
    field: {
      type: 'textarea',
      label: '备注',
      prop: 'remark',
      placeholder: '请输入详细说明',
      required: false,
      span: 'full',
      hint: '可用于较长的补充说明。',
      defaultValue: '',
      options: [],
    },
  },
  {
    type: 'select',
    title: '下拉选择',
    description: '适合部门、状态、类别等枚举字段。',
    category: '选择类',
    field: {
      type: 'select',
      label: '状态',
      prop: 'status',
      placeholder: '请选择',
      required: false,
      span: 'half',
      hint: '默认使用静态选项，后续可接字典接口。',
      defaultValue: '',
      options: [
        { label: '正常', value: '0' },
        { label: '停用', value: '1' },
      ],
    },
  },
  {
    type: 'switch',
    title: '布尔开关',
    description: '适合启停、是否默认、是否公开等布尔字段。',
    category: '选择类',
    field: {
      type: 'switch',
      label: '是否启用',
      prop: 'enabled',
      placeholder: '',
      required: false,
      span: 'half',
      hint: '适合 0/1 或 true/false 语义。',
      defaultValue: true,
      options: [],
    },
  },
  {
    type: 'date',
    title: '日期选择',
    description: '适合生效日期、截止日期、发布时间等字段。',
    category: '日期类',
    field: {
      type: 'date',
      label: '生效日期',
      prop: 'effectiveDate',
      placeholder: '',
      required: false,
      span: 'half',
      hint: '当前示例使用 shadcn-vue 日期选择器。',
      defaultValue: '',
      options: [],
    },
  },
  {
    type: 'phone',
    title: '手机号',
    description: '内置手机号输入语义，适合联系信息字段。',
    category: '业务类',
    field: {
      type: 'phone',
      label: '手机号码',
      prop: 'phonenumber',
      placeholder: '请输入手机号码',
      required: false,
      span: 'half',
      hint: '建议搭配 11 位手机号校验。',
      defaultValue: '',
      options: [],
    },
  },
  {
    type: 'email',
    title: '邮箱地址',
    description: '适合通知邮箱、联系邮箱等字段。',
    category: '业务类',
    field: {
      type: 'email',
      label: '邮箱地址',
      prop: 'email',
      placeholder: '请输入邮箱地址',
      required: false,
      span: 'half',
      hint: '建议搭配邮箱格式校验。',
      defaultValue: '',
      options: [],
    },
  },
]

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function appendIndex(base: string, index: number) {
  return index > 1 ? `${base}${index}` : base
}

export function createBuilderField(type: BuilderFieldType, index: number) {
  const template = builderTemplates.find(item => item.type === type)
  if (!template) {
    throw new Error(`Unsupported builder field type: ${type}`)
  }

  return {
    ...template.field,
    id: createId(type),
    label: appendIndex(template.field.label, index),
    prop: appendIndex(template.field.prop, index),
    options: template.field.options.map(option => ({ ...option })),
  } satisfies BuilderField
}

export function createUserFormPreset() {
  const fields: BuilderField[] = [
    createBuilderField('input', 1),
    createBuilderField('phone', 1),
    createBuilderField('email', 1),
    createBuilderField('select', 1),
    createBuilderField('switch', 1),
    createBuilderField('textarea', 1),
  ]

  Object.assign(fields[0], {
    label: '用户昵称',
    prop: 'nickName',
    placeholder: '请输入用户昵称',
    required: true,
    hint: '用于列表展示与个人信息展示。',
  })
  Object.assign(fields[1], {
    label: '手机号码',
    prop: 'phonenumber',
    placeholder: '请输入手机号码',
    required: true,
  })
  Object.assign(fields[2], {
    label: '邮箱地址',
    prop: 'email',
    placeholder: '请输入邮箱地址',
  })
  Object.assign(fields[3], {
    label: '所属部门',
    prop: 'deptId',
    placeholder: '请选择所属部门',
    options: [
      { label: '研发中心', value: '100' },
      { label: '市场运营部', value: '101' },
      { label: '质量保障部', value: '102' },
    ],
    hint: '后续可替换为树选择或远程字典。',
  })
  Object.assign(fields[4], {
    label: '账号状态',
    prop: 'status',
    defaultValue: true,
    hint: '用于控制账号启停。',
  })
  Object.assign(fields[5], {
    label: '备注',
    prop: 'remark',
    placeholder: '请输入备注',
    span: 'full',
  })

  return fields
}

export function parseBuilderOptions(input: string) {
  return input
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [labelPart, valuePart] = line.split(':')
      const label = (labelPart ?? '').trim()
      const value = (valuePart ?? labelPart ?? '').trim()
      return {
        label: label || value,
        value: value || label,
      }
    })
}

export function stringifyBuilderOptions(options: BuilderOption[]) {
  return options.map(option => `${option.label}:${option.value}`).join('\n')
}

