import { Injectable } from '@nestjs/common'

import { success, table } from '../../common/http/ruoyi-response'
import { PrismaService } from '../../infra/prisma/prisma.service'
import {
  type MockDbTable,
  type MockGenColumn,
  type MockGenTable,
  findMockDbTable,
  mockDbTables,
  mockGenColumns,
  mockGenTables,
} from '../../mock/tool.mock'
import { createZipArchive } from './zip.util'

@Injectable()
export class GenService {
  // 代码生成模块需要同时支持真库和无库联调，所以把内存态表、列和库目录都显式保留在服务层。
  private memoryTables: MockGenTable[] = structuredClone(mockGenTables)
  private memoryColumns: Record<number, MockGenColumn[]> = structuredClone(mockGenColumns)
  private memoryDbTables: MockDbTable[] = structuredClone(mockDbTables)
  private nextMemoryTableId = Math.max(0, ...mockGenTables.map(item => item.tableId)) + 1
  private nextMemoryColumnId = Math.max(0, ...Object.values(mockGenColumns).flat().map(item => item.columnId)) + 1

  constructor(private readonly prisma: PrismaService) {}

  async list(query: Record<string, unknown>) {
    const pageNum = this.parsePositiveNumber(query.pageNum, 1)
    const pageSize = this.parsePositiveNumber(query.pageSize, 10)
    const beginTime = this.readRangeParam(query, 'beginTime')
    const endTime = this.readRangeParam(query, 'endTime')

    const dbRows = await this.prisma.safeCall(async () => {
      const where = {
        ...(query.tableName ? { tableName: { contains: String(query.tableName) } } : {}),
        ...(query.tableComment ? { tableComment: { contains: String(query.tableComment) } } : {}),
        ...this.buildDateRangeWhere(beginTime, endTime),
      }

      const [total, items] = await Promise.all([
        this.prisma.sysGenTable.count({ where }),
        this.prisma.sysGenTable.findMany({
          where,
          orderBy: [{ tableId: 'asc' }],
          skip: (pageNum - 1) * pageSize,
          take: pageSize,
        }),
      ])

      return {
        total,
        rows: items.map(item => this.mapTableRow(item)),
      }
    })

    if (dbRows) {
      return table(dbRows.rows, dbRows.total)
    }

    const rows = this.filterMemoryTables(query, beginTime, endTime)
    return table(this.slicePage(rows, pageNum, pageSize), rows.length)
  }

  // db/list 先刷新当前数据库目录，再过滤掉已导入表，这样前端看到的是可导入表，而不是全库原始表。
  async listDb(query: Record<string, unknown>) {
    await this.refreshDatabaseCatalog()

    const pageNum = this.parsePositiveNumber(query.pageNum, 1)
    const pageSize = this.parsePositiveNumber(query.pageSize, 10)
    const importedNames = await this.getImportedTableNames()

    const rows = this.memoryDbTables
      .filter(item => !importedNames.has(item.tableName))
      .filter((item) => {
        const matchesName = !query.tableName || item.tableName.includes(String(query.tableName))
        const matchesComment = !query.tableComment || item.tableComment.includes(String(query.tableComment))
        return matchesName && matchesComment
      })
      .map(item => ({
        tableName: item.tableName,
        tableComment: item.tableComment,
        createTime: item.createTime,
        updateTime: item.updateTime,
      }))

    return table(this.slicePage(rows, pageNum, pageSize), rows.length)
  }
  async get(tableId: number) {
    await this.refreshDatabaseCatalog()
    const dbDetail = await this.prisma.safeCall(async () => {
      const info = await this.prisma.sysGenTable.findUnique({
        where: { tableId },
        include: { columns: { orderBy: [{ sort: 'asc' }, { columnId: 'asc' }] } },
      })
      if (!info) {
        return undefined
      }

      return {
        info: this.mapTableRow(info),
        rows: info.columns.map(item => this.mapColumnRow(item)),
        tables: this.catalogTables(info.tableName),
      }
    })

    if (dbDetail) {
      return success(dbDetail)
    }

    const info = this.memoryTables.find(item => item.tableId === tableId)
    if (!info) {
      return success({ info: undefined, rows: [], tables: this.catalogTables() })
    }

    return success({
      info,
      rows: this.memoryColumns[tableId] ?? [],
      tables: this.catalogTables(info.tableName),
    })
  }

  async update(payload: Record<string, unknown>) {
    const tableId = Number(payload.tableId)
    const columns = this.normalizeColumns(payload.columns, tableId)

    const updated = await this.prisma.safeCall(async () => {
      await this.prisma.sysGenTable.update({
        where: { tableId },
        data: this.buildTableData(payload, false),
      })
      await this.prisma.sysGenTableColumn.deleteMany({ where: { tableId } })
      if (columns.length > 0) {
        await this.prisma.sysGenTableColumn.createMany({
          data: columns.map((column, index) => this.buildColumnData(column, tableId, index)),
        })
      }
      return true
    })

    if (updated) {
      return success(undefined, '保存成功')
    }

    const index = this.memoryTables.findIndex(item => item.tableId === tableId)
    if (index >= 0) {
      this.memoryTables[index] = {
        ...this.memoryTables[index],
        ...this.buildMemoryTable(payload, tableId, this.memoryTables[index]),
        updateTime: this.formatDateTime(new Date()),
      }
      this.memoryColumns[tableId] = columns as MockGenColumn[]
    }

    return success(undefined, '保存成功')
  }

  // 导入表时优先写入 Prisma，数据库不可用时再回退到内存态，保证代码生成页在联调阶段仍然可操作。
  async importTable(payload: Record<string, unknown>) {
    await this.refreshDatabaseCatalog()
    const tableNames = this.parseStringList(payload.tables)
    const tplWebType = String(payload.tplWebType ?? 'element-plus')
    const sources = tableNames
      .map(name => this.findCatalogTable(name))
      .filter((item): item is MockDbTable => Boolean(item))

    if (!sources.length) {
      return success(undefined, '未找到可导入的数据表')
    }

    const imported = await this.prisma.safeCall(async () => {
      for (const source of sources) {
        await this.upsertPrismaTable(source, tplWebType)
      }
      return true
    })

    if (!imported) {
      for (const source of sources) {
        this.upsertMemoryTable(source, tplWebType)
      }
    }

    return success(undefined, '导入成功')
  }

  async createTable(payload: Record<string, unknown>) {
    const sql = String(payload.sql ?? '')
    const tplWebType = String(payload.tplWebType ?? 'element-plus')
    const parsedTables = this.parseCreateTableSql(sql)
    const statements = this.extractCreateTableStatements(sql)

    if (!parsedTables.length) {
      return success(undefined, '未解析到建表语句')
    }

    const executed = await this.prisma.safeCall(async () => {
      for (const statement of statements) {
        await this.prisma.$executeRawUnsafe(statement)
      }
      return true
    })

    if (executed) {
      await this.refreshDatabaseCatalog()
    }
    else {
      for (const item of parsedTables) {
        this.upsertCatalogTable(item)
      }
    }

    const created = await this.prisma.safeCall(async () => {
      for (const item of parsedTables) {
        await this.upsertPrismaTable(item, tplWebType)
      }
      return true
    })

    if (!created) {
      for (const item of parsedTables) {
        this.upsertMemoryTable(item, tplWebType)
      }
    }

    return success(undefined, '创建成功')
  }
  async preview(tableId: number) {
    const detail = await this.getTableDetail(tableId)
    if (!detail) {
      return success<Record<string, string>>({})
    }

    return success(this.buildPreviewFiles(detail.info, detail.rows))
  }

  async genCode(tableName: string) {
    const detail = await this.getTableDetailByName(tableName)
    if (!detail) {
      return success(undefined, '未找到生成配置')
    }

    return success(undefined, `已生成 ${detail.info.tableName} 代码`)
  }

  async batchGenCode(tables: string) {
    const tableNames = this.parseStringList(tables)
    const files: Record<string, string> = {}

    for (const tableName of tableNames) {
      const detail = await this.getTableDetailByName(tableName)
      if (!detail) {
        continue
      }

      const previewFiles = this.buildPreviewFiles(detail.info, detail.rows)
      for (const [path, content] of Object.entries(previewFiles)) {
        files[`${detail.info.tableName}/${path}`] = content
      }
    }

    return {
      fileName: tableNames.length === 1 ? `${tableNames[0]}.zip` : 'ruoyi-modern-code.zip',
      buffer: createZipArchive(files),
    }
  }

  async synchDb(tableName: string) {
    await this.refreshDatabaseCatalog()
    const source = this.findCatalogTable(tableName)
    if (!source) {
      return success(undefined, '未找到目标表结构')
    }

    const synced = await this.prisma.safeCall(async () => {
      const tableRow = await this.prisma.sysGenTable.findFirst({ where: { tableName } })
      if (!tableRow) {
        return false
      }

      await this.prisma.sysGenTable.update({
        where: { tableId: tableRow.tableId },
        data: {
          tableComment: source.tableComment,
          className: source.className,
          updateTime: new Date(),
        },
      })

      await this.prisma.sysGenTableColumn.deleteMany({ where: { tableId: tableRow.tableId } })
      await this.prisma.sysGenTableColumn.createMany({
        data: source.columns.map((column, index) => this.buildColumnData(column, tableRow.tableId, index)),
      })
      return true
    })

    if (!synced) {
      const existing = this.memoryTables.find(item => item.tableName === tableName)
      if (existing) {
        existing.tableComment = source.tableComment
        existing.className = source.className
        existing.updateTime = this.formatDateTime(new Date())
        this.memoryColumns[existing.tableId] = source.columns.map((column, index) => ({
          ...column,
          tableId: existing.tableId,
          columnId: this.nextMemoryColumnId + index,
        }))
        this.nextMemoryColumnId += source.columns.length
      }
    }

    return success(undefined, '同步成功')
  }

  async remove(tableId: string) {
    const ids = this.parseIdList(tableId)

    const removed = await this.prisma.safeCall(async () => {
      await this.prisma.sysGenTableColumn.deleteMany({ where: { tableId: { in: ids } } })
      await this.prisma.sysGenTable.deleteMany({ where: { tableId: { in: ids } } })
      return true
    })

    if (!removed) {
      this.memoryTables = this.memoryTables.filter(item => !ids.includes(item.tableId))
      for (const id of ids) {
        delete this.memoryColumns[id]
      }
    }

    return success(undefined, '删除成功')
  }

  private filterMemoryTables(query: Record<string, unknown>, beginTime?: Date, endTime?: Date) {
    return this.memoryTables
      .filter((item) => {
        const matchesName = !query.tableName || item.tableName.includes(String(query.tableName))
        const matchesComment = !query.tableComment || item.tableComment.includes(String(query.tableComment))
        const date = new Date(item.createTime)
        const matchesBegin = !beginTime || Number.isNaN(date.getTime()) || date >= beginTime
        const matchesEnd = !endTime || Number.isNaN(date.getTime()) || date <= endTime
        return matchesName && matchesComment && matchesBegin && matchesEnd
      })
      .map(item => ({ ...item }))
  }

  private async getImportedTableNames() {
    const dbNames = await this.prisma.safeCall(async () => {
      const rows = await this.prisma.sysGenTable.findMany({ select: { tableName: true } })
      return new Set(rows.map(item => item.tableName))
    })

    if (dbNames) {
      return dbNames
    }

    return new Set(this.memoryTables.map(item => item.tableName))
  }

  private catalogTables(excludeTableName?: string) {
    return this.memoryDbTables
      .filter(item => item.tableName !== excludeTableName)
      .map(item => ({
        tableName: item.tableName,
        tableComment: item.tableComment,
        columns: item.columns.map((column, index) => ({
          ...column,
          columnId: index + 1,
        })),
      }))
  }

  private async getTableDetail(tableId: number) {
    const dbDetail = await this.prisma.safeCall(async () => {
      const info = await this.prisma.sysGenTable.findUnique({
        where: { tableId },
        include: { columns: { orderBy: [{ sort: 'asc' }, { columnId: 'asc' }] } },
      })
      if (!info) {
        return undefined
      }

      return {
        info: this.mapTableRow(info),
        rows: info.columns.map(item => this.mapColumnRow(item)),
      }
    })

    if (dbDetail) {
      return dbDetail
    }

    const info = this.memoryTables.find(item => item.tableId === tableId)
    if (!info) {
      return undefined
    }

    return {
      info,
      rows: this.memoryColumns[info.tableId] ?? [],
    }
  }

  private async getTableDetailByName(tableName: string) {
    const dbDetail = await this.prisma.safeCall(async () => {
      const info = await this.prisma.sysGenTable.findFirst({
        where: { tableName },
        include: { columns: { orderBy: [{ sort: 'asc' }, { columnId: 'asc' }] } },
      })
      if (!info) {
        return undefined
      }

      return {
        info: this.mapTableRow(info),
        rows: info.columns.map(item => this.mapColumnRow(item)),
      }
    })

    if (dbDetail) {
      return dbDetail
    }

    const info = this.memoryTables.find(item => item.tableName === tableName)
    if (!info) {
      return undefined
    }

    return {
      info,
      rows: this.memoryColumns[info.tableId] ?? [],
    }
  }

  private async upsertPrismaTable(source: MockDbTable, tplWebType: string) {
    const existing = await this.prisma.sysGenTable.findFirst({ where: { tableName: source.tableName } })
    const payload = this.buildMemoryTable({ tplWebType }, existing?.tableId ?? 0, existing ? this.mapTableRow(existing) : undefined, source)

    let tableId = existing?.tableId
    if (existing) {
      await this.prisma.sysGenTable.update({
        where: { tableId: existing.tableId },
        data: this.buildTableData(payload, false),
      })
      await this.prisma.sysGenTableColumn.deleteMany({ where: { tableId: existing.tableId } })
    }
    else {
      const created = await this.prisma.sysGenTable.create({
        data: this.buildTableData(payload, true),
      })
      tableId = created.tableId
    }

    if (!tableId) {
      return
    }

    if (source.columns.length > 0) {
      await this.prisma.sysGenTableColumn.createMany({
        data: source.columns.map((column, index) => this.buildColumnData(column, tableId, index)),
      })
    }
  }
  private upsertMemoryTable(source: MockDbTable, tplWebType: string) {
    const existing = this.memoryTables.find(item => item.tableName === source.tableName)
    if (existing) {
      const next = this.buildMemoryTable({ tplWebType }, existing.tableId, existing, source)
      Object.assign(existing, next, { updateTime: this.formatDateTime(new Date()) })
      this.memoryColumns[existing.tableId] = source.columns.map((column, index) => ({
        ...column,
        tableId: existing.tableId,
        columnId: this.nextMemoryColumnId + index,
      }))
      this.nextMemoryColumnId += source.columns.length
      return
    }

    const tableId = this.nextMemoryTableId
    this.nextMemoryTableId += 1
    const tableRow = this.buildMemoryTable({ tplWebType }, tableId, undefined, source)
    this.memoryTables.push(tableRow)
    this.memoryColumns[tableId] = source.columns.map((column, index) => ({
      ...column,
      tableId,
      columnId: this.nextMemoryColumnId + index,
    }))
    this.nextMemoryColumnId += source.columns.length
  }

  private upsertCatalogTable(source: MockDbTable) {
    const index = this.memoryDbTables.findIndex(item => item.tableName === source.tableName)
    if (index >= 0) {
      this.memoryDbTables[index] = source
      return
    }
    this.memoryDbTables.push(source)
  }

  private findCatalogTable(tableName: string) {
    return this.memoryDbTables.find(item => item.tableName === tableName) ?? findMockDbTable(tableName)
  }

  private buildTableData(payload: any, creating: boolean) {
    const params = this.normalizeParams(payload.params)
    return {
      tableName: String(payload.tableName ?? ''),
      tableComment: this.toOptionalString(payload.tableComment),
      subTableName: this.toOptionalString(payload.subTableName),
      subTableFkName: this.toOptionalString(payload.subTableFkName),
      className: this.toOptionalString(payload.className),
      tplCategory: String(payload.tplCategory ?? 'crud'),
      packageName: this.toOptionalString(payload.packageName),
      moduleName: this.toOptionalString(payload.moduleName),
      businessName: this.toOptionalString(payload.businessName),
      functionName: this.toOptionalString(payload.functionName),
      functionAuthor: this.toOptionalString(payload.functionAuthor),
      genType: String(payload.genType ?? '0'),
      genPath: this.toOptionalString(payload.genPath),
      tplWebType: this.toOptionalString(payload.tplWebType) ?? 'element-plus',
      options: params,
      remark: this.toOptionalString(payload.remark),
      ...(creating ? { createTime: new Date() } : {}),
      updateTime: new Date(),
    }
  }

  private buildColumnData(column: any, tableId: number, index: number) {
    return {
      tableId,
      columnName: String(column.columnName ?? ''),
      columnComment: this.toOptionalString(column.columnComment) ?? String(column.columnName ?? ''),
      columnType: String(column.columnType ?? 'varchar(255)'),
      javaType: this.toOptionalString(column.javaType) ?? 'String',
      javaField: this.toOptionalString(column.javaField) ?? this.columnToJavaField(String(column.columnName ?? 'field')),
      isPk: String(column.isPk ?? '0'),
      isIncrement: String(column.isIncrement ?? '0'),
      isRequired: String(column.isRequired ?? '0'),
      isInsert: String(column.isInsert ?? '1'),
      isEdit: String(column.isEdit ?? '1'),
      isList: String(column.isList ?? '1'),
      isQuery: String(column.isQuery ?? '0'),
      queryType: String(column.queryType ?? 'EQ'),
      htmlType: this.toOptionalString(column.htmlType) ?? 'input',
      dictType: this.toOptionalString(column.dictType),
      sort: this.parsePositiveNumber(column.sort, index + 1),
      createTime: new Date(),
      updateTime: new Date(),
    }
  }

  private buildMemoryTable(
    payload: any,
    tableId: number,
    existing?: Partial<MockGenTable>,
    source?: MockDbTable,
  ): MockGenTable {
    const params = this.normalizeParams(payload.params)
    const tableName = String(payload.tableName ?? source?.tableName ?? existing?.tableName ?? '')
    const tableComment = String(payload.tableComment ?? source?.tableComment ?? existing?.tableComment ?? '')
    const businessName = String(payload.businessName ?? existing?.businessName ?? this.businessNameFromTable(tableName))

    return {
      tableId,
      tableName,
      tableComment,
      className: String(payload.className ?? source?.className ?? existing?.className ?? this.classNameFromTable(tableName)),
      tplCategory: String(payload.tplCategory ?? source?.tplCategory ?? existing?.tplCategory ?? 'crud'),
      packageName: String(payload.packageName ?? existing?.packageName ?? 'com.ruoyi.system'),
      moduleName: String(payload.moduleName ?? existing?.moduleName ?? 'system'),
      businessName,
      functionName: String(payload.functionName ?? existing?.functionName ?? tableComment ?? businessName),
      functionAuthor: String(payload.functionAuthor ?? existing?.functionAuthor ?? 'RuoYi Modern'),
      genType: String(payload.genType ?? existing?.genType ?? '0'),
      genPath: String(payload.genPath ?? existing?.genPath ?? '/'),
      tplWebType: String(payload.tplWebType ?? existing?.tplWebType ?? 'element-plus'),
      parentMenuId: String(payload.parentMenuId ?? params.parentMenuId ?? existing?.parentMenuId ?? '0'),
      subTableName: String(payload.subTableName ?? existing?.subTableName ?? ''),
      subTableFkName: String(payload.subTableFkName ?? existing?.subTableFkName ?? ''),
      treeCode: String(payload.treeCode ?? params.treeCode ?? existing?.treeCode ?? ''),
      treeName: String(payload.treeName ?? params.treeName ?? existing?.treeName ?? ''),
      treeParentCode: String(payload.treeParentCode ?? params.treeParentCode ?? existing?.treeParentCode ?? ''),
      remark: String(payload.remark ?? existing?.remark ?? `${tableComment}生成配置`),
      createTime: String(existing?.createTime ?? source?.createTime ?? this.formatDateTime(new Date())),
      updateTime: this.formatDateTime(new Date()),
    }
  }

  private normalizeColumns(value: unknown, tableId: number) {
    if (!Array.isArray(value)) {
      return []
    }

    return value.map((item, index) => ({
      ...(item as Record<string, unknown>),
      tableId,
      columnId: this.parsePositiveNumber((item as Record<string, unknown>).columnId, this.nextMemoryColumnId + index),
      sort: this.parsePositiveNumber((item as Record<string, unknown>).sort, index + 1),
    }))
  }

  private normalizeParams(raw: unknown) {
    const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
    return {
      parentMenuId: String(value.parentMenuId ?? '0'),
      treeCode: String(value.treeCode ?? ''),
      treeName: String(value.treeName ?? ''),
      treeParentCode: String(value.treeParentCode ?? ''),
    }
  }

  private mapTableRow(item: any) {
    const params = this.normalizeParams(item.options)
    return {
      tableId: item.tableId,
      tableName: item.tableName,
      tableComment: item.tableComment ?? '',
      className: item.className ?? this.classNameFromTable(item.tableName),
      tplCategory: item.tplCategory ?? 'crud',
      packageName: item.packageName ?? 'com.ruoyi.system',
      moduleName: item.moduleName ?? 'system',
      businessName: item.businessName ?? this.businessNameFromTable(item.tableName),
      functionName: item.functionName ?? item.tableComment ?? this.businessNameFromTable(item.tableName),
      functionAuthor: item.functionAuthor ?? 'RuoYi Modern',
      genType: item.genType ?? '0',
      genPath: item.genPath ?? '/',
      tplWebType: item.tplWebType ?? 'element-plus',
      parentMenuId: params.parentMenuId,
      treeCode: params.treeCode,
      treeName: params.treeName,
      treeParentCode: params.treeParentCode,
      subTableName: item.subTableName ?? '',
      subTableFkName: item.subTableFkName ?? '',
      remark: item.remark ?? '',
      params,
      createTime: this.formatDateTime(item.createTime),
      updateTime: this.formatDateTime(item.updateTime),
    }
  }

  private mapColumnRow(item: any) {
    return {
      columnId: item.columnId,
      tableId: item.tableId,
      columnName: item.columnName,
      columnComment: item.columnComment ?? '',
      columnType: item.columnType,
      javaType: item.javaType ?? 'String',
      javaField: item.javaField ?? this.columnToJavaField(item.columnName),
      isPk: item.isPk ?? '0',
      isIncrement: item.isIncrement ?? '0',
      isRequired: item.isRequired ?? '0',
      isInsert: item.isInsert ?? '1',
      isEdit: item.isEdit ?? '1',
      isList: item.isList ?? '1',
      isQuery: item.isQuery ?? '0',
      queryType: item.queryType ?? 'EQ',
      htmlType: item.htmlType ?? 'input',
      dictType: item.dictType ?? '',
      sort: item.sort ?? 0,
    }
  }
  private buildPreviewFiles(info: Record<string, any>, rows: Array<Record<string, any>>) {
    const className = String(info.className || this.classNameFromTable(String(info.tableName ?? 'gen_table')))
    const businessName = String(info.businessName || this.businessNameFromTable(String(info.tableName ?? 'gen_table')))
    const moduleName = String(info.moduleName || 'system')
    const functionName = String(info.functionName || info.tableComment || businessName)
    const apiPath = `src/api/${moduleName}/${businessName}.ts`
    const viewPath = `src/views/${moduleName}/${businessName}/index.vue`

    return {
      [`java/${className}.java`]: this.renderEntity(info, rows),
      [`java/${className}Controller.java`]: this.renderController(info, className),
      [apiPath]: this.renderApi(info, businessName),
      [viewPath]: this.renderView(info, rows, functionName),
      [`sql/${String(info.tableName)}-menu.sql`]: this.renderMenuSql(info, functionName),
    }
  }

  private renderEntity(info: Record<string, any>, rows: Array<Record<string, any>>) {
    const fields = rows
      .map((column) => `    /** ${column.columnComment || column.columnName} */\n    private ${column.javaType || 'String'} ${column.javaField || this.columnToJavaField(String(column.columnName))};`)
      .join('\n\n')

    return `package ${info.packageName || 'com.ruoyi.system'}.domain;\n\npublic class ${info.className || this.classNameFromTable(String(info.tableName ?? 'GenTable'))} {\n${fields ? `${fields}\n` : ''}}\n`
  }

  private renderController(info: Record<string, any>, className: string) {
    const businessName = String(info.businessName || this.businessNameFromTable(String(info.tableName ?? 'gen_table')))
    const functionName = String(info.functionName || info.tableComment || businessName)
    return `package ${info.packageName || 'com.ruoyi.system'}.controller;\n\n@RestController\n@RequestMapping("/${String(info.moduleName || 'system')}/${businessName}")\npublic class ${className}Controller {\n    // ${functionName} controller preview\n}\n`
  }

  private renderApi(info: Record<string, any>, businessName: string) {
    const moduleName = String(info.moduleName || 'system')
    const className = String(info.className || this.classNameFromTable(String(info.tableName ?? 'GenTable')))
    return `import { request } from '@/utils/request'\n\nexport function list${className}(query?: Record<string, unknown>) {\n  return request({ url: '/${moduleName}/${businessName}/list', method: 'get', params: query })\n}\n`
  }

  private renderView(info: Record<string, any>, rows: Array<Record<string, any>>, functionName: string) {
    const columns = rows
      .filter(column => String(column.isList ?? '1') === '1')
      .map((column) => `  { key: '${column.javaField || this.columnToJavaField(String(column.columnName))}', title: '${column.columnComment || column.columnName}' },`)
      .join('\n')

    return `<script setup lang="ts">\nconst columns = [\n${columns}\n]\n</script>\n\n<template>\n  <div>\n    <h1>${functionName}</h1>\n  </div>\n</template>\n`
  }

  private renderMenuSql(info: Record<string, any>, functionName: string) {
    const businessName = String(info.businessName || this.businessNameFromTable(String(info.tableName ?? 'gen_table')))
    const moduleName = String(info.moduleName || 'system')
    return `-- ${functionName} 菜单 SQL\nINSERT INTO sys_menu(menu_name, parent_id, order_num, path, component, menu_type, visible, status, perms, icon, create_time)\nVALUES ('${functionName}', ${Number(info.parentMenuId ?? 0)}, 1, '${businessName}', '${moduleName}/${businessName}/index', 'C', '0', '0', '${moduleName}:${businessName}:list', 'table', NOW());\n`
  }


  private extractCreateTableStatements(sql: string) {
    return (sql.match(/create\s+table[\s\S]*?;/ig) ?? [])
      .map(item => item.trim())
      .filter(Boolean)
  }

  private async refreshDatabaseCatalog() {
    const catalog = await this.scanDatabaseCatalog()
    if (catalog && catalog.length > 0) {
      this.memoryDbTables = catalog
    }
    return catalog
  }

  private async scanDatabaseCatalog() {
    const dbCatalog = await this.prisma.safeCall(async () => {
      const tables = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(`
        SELECT
          TABLE_NAME AS tableName,
          TABLE_COMMENT AS tableComment,
          CREATE_TIME AS createTime,
          UPDATE_TIME AS updateTime
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        ORDER BY TABLE_NAME
      `)

      const columns = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(`
        SELECT
          TABLE_NAME AS tableName,
          COLUMN_NAME AS columnName,
          COLUMN_COMMENT AS columnComment,
          COLUMN_TYPE AS columnType,
          COLUMN_KEY AS columnKey,
          EXTRA AS extra,
          IS_NULLABLE AS isNullable,
          ORDINAL_POSITION AS ordinalPosition
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        ORDER BY TABLE_NAME, ORDINAL_POSITION
      `)

      const columnsByTable = new Map<string, MockGenColumn[]>()
      for (const item of columns) {
        const tableName = String(item.tableName)
        const existing = columnsByTable.get(tableName) ?? []
        const index = Number(item.ordinalPosition ?? existing.length + 1) - 1
        existing.push({
          ...this.createCatalogColumn(String(item.columnName), String(item.columnType), Math.max(index, 0)),
          columnComment: String(item.columnComment ?? item.columnName),
          isPk: String(item.columnKey ?? '').toUpperCase() === 'PRI' ? '1' : '0',
          isIncrement: String(item.extra ?? '').toLowerCase().includes('auto_increment') ? '1' : '0',
          isRequired: String(item.isNullable ?? '').toUpperCase() === 'NO' ? '1' : '0',
          isInsert: String(item.columnKey ?? '').toUpperCase() === 'PRI' ? '0' : '1',
          isEdit: String(item.columnKey ?? '').toUpperCase() === 'PRI' ? '0' : '1',
          isList: '1',
          isQuery: this.defaultQueryFlag(String(item.columnName)),
          queryType: this.defaultQueryType(String(item.columnName), String(item.columnType)),
          htmlType: this.defaultHtmlType(String(item.columnName), String(item.columnType)),
          dictType: this.defaultDictType(String(item.columnName)),
        })
        columnsByTable.set(tableName, existing)
      }

      return tables.map((item) => {
        const tableName = String(item.tableName)
        return {
          tableName,
          tableComment: String(item.tableComment ?? tableName),
          className: this.classNameFromTable(tableName),
          tplCategory: 'crud',
          createTime: this.formatDateTime(item.createTime),
          updateTime: this.formatDateTime(item.updateTime),
          columns: columnsByTable.get(tableName) ?? [],
        }
      })
    })

    return dbCatalog
  }
  private parseCreateTableSql(sql: string) {
    const blocks = sql.match(/create\s+table[\s\S]*?;/ig) ?? []
    return blocks.map((block, blockIndex) => this.parseCreateTableBlock(block, blockIndex)).filter((item): item is MockDbTable => Boolean(item))
  }

  private parseCreateTableBlock(block: string, blockIndex: number) {
    const tableMatch = block.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:[`'\"]?[\w]+[`'\"]?\.)?[`'\"]?([\w]+)[`'\"]?/i)
    if (!tableMatch) {
      return undefined
    }

    const tableName = tableMatch[1]
    const commentMatch = block.match(/comment\s*=\s*'([^']+)'/i)
    const tableComment = commentMatch?.[1] ?? tableName
    const bodyStart = block.indexOf('(')
    const bodyEnd = block.lastIndexOf(')')
    const body = bodyStart >= 0 && bodyEnd > bodyStart ? block.slice(bodyStart + 1, bodyEnd) : ''
    const lines = body.split(/\r?\n/).map(item => item.trim()).filter(Boolean)

    const columns = lines
      .filter(line => !/^(primary|unique|key|constraint|index)/i.test(line))
      .map((line, index) => this.parseColumnLine(line, index))
      .filter((item): item is MockGenColumn => Boolean(item))

    return {
      tableName,
      tableComment,
      className: this.classNameFromTable(tableName),
      tplCategory: 'crud',
      createTime: this.formatDateTime(new Date(Date.now() + blockIndex * 1000)),
      updateTime: this.formatDateTime(new Date()),
      columns,
    }
  }

  private parseColumnLine(line: string, index: number) {
    const match = line.match(/^[`'\"]?([\w]+)[`'\"]?\s+([^\s,]+(?:\([^\)]*\))?)/i)
    if (!match) {
      return undefined
    }

    const columnName = match[1]
    const columnType = match[2]
    const lowerLine = line.toLowerCase()
    const commentMatch = line.match(/comment\s+'([^']+)'/i)
    const isPk = /primary\s+key/i.test(line) || columnName === 'id' || (/_id$/i.test(columnName) && index === 0)
    const isIncrement = /auto_increment/i.test(lowerLine)

    return {
      ...this.createCatalogColumn(columnName, columnType, index),
      columnComment: commentMatch?.[1] ?? columnName,
      isPk: isPk ? '1' : '0',
      isIncrement: isIncrement ? '1' : '0',
      isInsert: isPk ? '0' : '1',
      isEdit: isPk ? '0' : '1',
      isList: '1',
      isQuery: this.defaultQueryFlag(columnName),
      queryType: this.defaultQueryType(columnName, columnType),
      htmlType: this.defaultHtmlType(columnName, columnType),
      dictType: this.defaultDictType(columnName),
    }
  }

  private createCatalogColumn(columnName: string, columnType: string, index: number) {
    return {
      columnId: this.nextMemoryColumnId + index,
      columnName,
      columnComment: columnName,
      columnType,
      javaType: this.javaTypeFromColumnType(columnType),
      javaField: this.columnToJavaField(columnName),
      isPk: '0',
      isIncrement: '0',
      isRequired: this.defaultRequiredFlag(columnName),
      isInsert: '1',
      isEdit: '1',
      isList: '1',
      isQuery: '0',
      queryType: 'EQ',
      htmlType: this.defaultHtmlType(columnName, columnType),
      dictType: this.defaultDictType(columnName),
      sort: index + 1,
    }
  }

  private javaTypeFromColumnType(columnType: string) {
    const text = columnType.toLowerCase()
    if (/(bigint)/.test(text)) return 'Long'
    if (/(int|tinyint|smallint)/.test(text)) return 'Integer'
    if (/(decimal|numeric)/.test(text)) return 'BigDecimal'
    if (/(double|float)/.test(text)) return 'Double'
    if (/(datetime|timestamp|date)/.test(text)) return 'Date'
    if (/(bit|boolean)/.test(text)) return 'Boolean'
    return 'String'
  }

  private defaultHtmlType(columnName: string, columnType: string) {
    const text = `${columnName} ${columnType}`.toLowerCase()
    if (/(notice_content|content)/.test(columnName.toLowerCase())) return 'editor'
    if (/(content|remark|description|target)/.test(text)) return 'textarea'
    if (/(datetime|timestamp|date)/.test(text)) return 'datetime'
    if (/(status|type|sex)/.test(text)) return 'select'
    return 'input'
  }

  private defaultDictType(columnName: string) {
    const text = columnName.toLowerCase()
    if (text === 'status') return 'sys_normal_disable'
    if (text === 'sex') return 'sys_user_sex'
    if (text === 'notice_type') return 'sys_notice_type'
    return ''
  }

  private defaultQueryFlag(columnName: string) {
    return /(name|code|status|type|time|date)$/i.test(columnName) ? '1' : '0'
  }

  private defaultRequiredFlag(columnName: string) {
    return /(name|title|code|type|status)/i.test(columnName) ? '1' : '0'
  }

  private defaultQueryType(columnName: string, columnType: string) {
    if (/(datetime|timestamp|date)/i.test(columnType)) return 'BETWEEN'
    if (/(name|title|comment|remark)/i.test(columnName)) return 'LIKE'
    return 'EQ'
  }

  private classNameFromTable(tableName: string) {
    return tableName.split('_').filter(Boolean).map(item => item.charAt(0).toUpperCase() + item.slice(1)).join('') || 'GenTable'
  }

  private businessNameFromTable(tableName: string) {
    const parts = tableName.split('_').filter(Boolean)
    return parts.length > 1 ? parts.slice(1).join('_') : tableName
  }

  private columnToJavaField(columnName: string) {
    return columnName.replace(/_([a-z])/g, (_, value: string) => value.toUpperCase())
  }

  private parseStringList(value: unknown) {
    return String(value ?? '').split(',').map(item => item.trim()).filter(Boolean)
  }

  private parseIdList(value: unknown) {
    return this.parseStringList(value).map(item => Number(item)).filter(item => Number.isFinite(item) && item > 0)
  }

  private parsePositiveNumber(value: unknown, fallback: number) {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
  }

  private toOptionalString(value: unknown) {
    const text = String(value ?? '').trim()
    return text ? text : null
  }

  private slicePage<T>(rows: T[], pageNum: number, pageSize: number) {
    const start = (pageNum - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }

  private readRangeParam(query: Record<string, unknown>, key: string) {
    const raw = query[`params[${key}]`] ?? query[key]
    if (!raw) return undefined
    const parsed = new Date(String(raw))
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }

  private buildDateRangeWhere(beginTime?: Date, endTime?: Date) {
    if (!beginTime && !endTime) return {}
    return {
      createTime: {
        ...(beginTime ? { gte: beginTime } : {}),
        ...(endTime ? { lte: endTime } : {}),
      },
    }
  }

  private formatDateTime(value: unknown) {
    if (!value) return ''
    const date = value instanceof Date ? value : new Date(String(value))
    if (Number.isNaN(date.getTime())) return String(value)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
}