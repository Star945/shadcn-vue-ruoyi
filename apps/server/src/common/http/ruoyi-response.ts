export interface AjaxResult<T = unknown> {
  code: number
  msg: string
  data?: T
  [key: string]: unknown
}

export interface TableResult<T = unknown> {
  code: number
  msg: string
  rows: T[]
  total: number
}

export function success<T>(data?: T, msg = '操作成功'): AjaxResult<T> {
  if (data === undefined) {
    return { code: 200, msg }
  }
  return { code: 200, msg, data }
}

export function table<T>(rows: T[], total = rows.length, msg = '查询成功'): TableResult<T> {
  return {
    code: 200,
    msg,
    rows,
    total,
  }
}
