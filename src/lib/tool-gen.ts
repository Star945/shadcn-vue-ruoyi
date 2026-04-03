export const tplCategoryOptions = [
  { label: '单表', value: 'crud' },
  { label: '树表', value: 'tree' },
  { label: '主子表', value: 'sub' },
] as const

export const tplWebTypeOptions = [
  { label: 'Vue2 Element UI', value: 'element-ui' },
  { label: 'Vue3 Element Plus', value: 'element-plus' },
  { label: 'Vue3 Element Plus TypeScript', value: 'element-plus-typescript' },
] as const

export const genTypeOptions = [
  { label: 'ZIP 压缩包', value: '0' },
  { label: '自定义路径', value: '1' },
] as const

export const javaTypeOptions = ['Long', 'String', 'Integer', 'Double', 'BigDecimal', 'Date', 'Boolean'] as const

export const queryTypeOptions = [
  { label: '=', value: 'EQ' },
  { label: '!=', value: 'NE' },
  { label: '>', value: 'GT' },
  { label: '>=', value: 'GTE' },
  { label: '<', value: 'LT' },
  { label: '<=', value: 'LTE' },
  { label: 'LIKE', value: 'LIKE' },
  { label: 'BETWEEN', value: 'BETWEEN' },
] as const

export const htmlTypeOptions = [
  { label: '输入框', value: 'input' },
  { label: '文本域', value: 'textarea' },
  { label: '下拉框', value: 'select' },
  { label: '单选框', value: 'radio' },
  { label: '复选框', value: 'checkbox' },
  { label: '日期控件', value: 'datetime' },
  { label: '图片上传', value: 'imageUpload' },
  { label: '文件上传', value: 'fileUpload' },
  { label: '富文本', value: 'editor' },
] as const

const tplCategoryMap: Record<string, string> = {
  crud: '单表',
  tree: '树表',
  sub: '主子表',
}

function stringValue(value: unknown, fallback = '') {
  if (value === undefined || value === null) {
    return fallback
  }
  return String(value)
}

function flagValue(value: unknown) {
  return String(value) === '1' ? '1' : '0'
}

export function tplCategoryLabel(value: unknown) {
  const key = stringValue(value)
  return tplCategoryMap[key] ?? key ?? '--'
}

export function previewFileName(path: string) {
  const fileName = path.slice(path.lastIndexOf('/') + 1)
  const vmIndex = fileName.indexOf('.vm')
  return vmIndex >= 0 ? fileName.slice(0, vmIndex) : fileName
}

export function normalizeGenInfo(raw: Record<string, any> | undefined) {
  const params = raw?.params ?? {}
  return {
    tableId: stringValue(raw?.tableId),
    tableName: stringValue(raw?.tableName),
    tableComment: stringValue(raw?.tableComment),
    className: stringValue(raw?.className),
    functionAuthor: stringValue(raw?.functionAuthor),
    remark: stringValue(raw?.remark),
    tplCategory: stringValue(raw?.tplCategory, 'crud'),
    tplWebType: stringValue(raw?.tplWebType, 'element-plus'),
    packageName: stringValue(raw?.packageName),
    moduleName: stringValue(raw?.moduleName),
    businessName: stringValue(raw?.businessName),
    functionName: stringValue(raw?.functionName),
    genType: stringValue(raw?.genType, '0'),
    genPath: stringValue(raw?.genPath, '/'),
    parentMenuId: stringValue(raw?.parentMenuId ?? params.parentMenuId, '0'),
    treeCode: stringValue(raw?.treeCode ?? params.treeCode),
    treeName: stringValue(raw?.treeName ?? params.treeName),
    treeParentCode: stringValue(raw?.treeParentCode ?? params.treeParentCode),
    subTableName: stringValue(raw?.subTableName),
    subTableFkName: stringValue(raw?.subTableFkName),
  }
}

export function normalizeGenColumns(raw: Array<Record<string, any>> | undefined) {
  return (Array.isArray(raw) ? raw : []).map((column, index) => ({
    ...column,
    sort: Number(column.sort ?? index + 1),
    javaType: stringValue(column.javaType, 'String'),
    javaField: stringValue(column.javaField),
    isInsert: flagValue(column.isInsert),
    isEdit: flagValue(column.isEdit),
    isList: flagValue(column.isList),
    isQuery: flagValue(column.isQuery),
    isRequired: flagValue(column.isRequired),
    queryType: stringValue(column.queryType, 'EQ'),
    htmlType: stringValue(column.htmlType, 'input'),
    dictType: stringValue(column.dictType),
    columnComment: stringValue(column.columnComment),
  }))
}
