export interface CsvColumn<T extends Record<string, unknown>> {
  key: keyof T | string
  title: string
  formatter?: (row: T) => unknown
}

function escapeCell(value: unknown) {
  const text = String(value ?? '')
  const escaped = text.replace(/"/g, '""')
  if (/[",\r\n]/.test(escaped)) {
    return `"${escaped}"`
  }
  return escaped
}

export function createCsvBuffer<T extends Record<string, unknown>>(rows: T[], columns: Array<CsvColumn<T>>) {
  const header = columns.map(column => escapeCell(column.title)).join(',')
  const lines = rows.map((row) => {
    return columns
      .map((column) => {
        const value = column.formatter ? column.formatter(row) : row[column.key as keyof T]
        return escapeCell(value)
      })
      .join(',')
  })

  return Buffer.from(`\uFEFF${[header, ...lines].join('\r\n')}`, 'utf8')
}