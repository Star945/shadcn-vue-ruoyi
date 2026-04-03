import type { Component } from 'vue'

export interface AdminTableColumn {
  key: string
  title: string
  headerClass?: string
  cellClass?: string
}

export interface AdminTableActionItem<Row = Record<string, any>> {
  key?: string
  label: string
  icon?: Component
  tone?: 'default' | 'muted' | 'danger'
  visible?: boolean | ((row: Row, index: number) => boolean)
  disabled?: boolean | ((row: Row, index: number) => boolean)
  onClick?: (row: Row, index: number) => void
}
