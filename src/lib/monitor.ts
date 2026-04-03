export const monitorResultOptions = [
  { label: '全部', value: 'all' },
  { label: '成功', value: '0' },
  { label: '失败', value: '1' },
] as const

export const monitorOperTypeOptions = [
  { label: '全部', value: 'all' },
  { label: '其他', value: '0' },
  { label: '新增', value: '1' },
  { label: '修改', value: '2' },
  { label: '删除', value: '3' },
  { label: '授权', value: '4' },
  { label: '导出', value: '5' },
  { label: '导入', value: '6' },
  { label: '强退', value: '7' },
  { label: '代码生成', value: '8' },
  { label: '清空', value: '9' },
] as const

export function monitorResultLabel(value: unknown) {
  const key = value === undefined || value === null ? '' : String(value)
  if (key === '0' || key.toLowerCase() === 'success') {
    return '成功'
  }
  if (key === '1' || key.toLowerCase() === 'failure' || key.toLowerCase() === 'fail') {
    return '失败'
  }
  return key || '--'
}

export function monitorOperStatusLabel(value: unknown) {
  const key = value === undefined || value === null ? '' : String(value)
  if (key === '0' || key.toLowerCase() === 'normal') {
    return '正常'
  }
  if (key === '1' || key.toLowerCase() === 'warning' || key.toLowerCase() === 'exception') {
    return '异常'
  }
  return key || '--'
}

export function monitorOperTypeLabel(value: unknown) {
  const key = value === undefined || value === null ? '' : String(value)
  const matched = monitorOperTypeOptions.find(option => option.value === key)
  return matched?.label ?? key ?? '--'
}

export function prettyJson(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return '暂无数据'
  }
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    }
    catch {
      return value
    }
  }
  try {
    return JSON.stringify(value, null, 2)
  }
  catch {
    return String(value)
  }
}
