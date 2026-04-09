export interface MockGenColumn {
  columnId: number
  tableId?: number
  columnName: string
  columnComment: string
  columnType: string
  javaType: string
  javaField: string
  isPk: string
  isIncrement: string
  isRequired: string
  isInsert: string
  isEdit: string
  isList: string
  isQuery: string
  queryType: string
  htmlType: string
  dictType: string
  sort: number
}

export interface MockDbTable {
  tableName: string
  tableComment: string
  className: string
  tplCategory: string
  createTime: string
  updateTime: string
  columns: MockGenColumn[]
}

export interface MockGenTable {
  tableId: number
  tableName: string
  tableComment: string
  className: string
  tplCategory: string
  packageName: string
  moduleName: string
  businessName: string
  functionName: string
  functionAuthor: string
  genType: string
  genPath: string
  tplWebType: string
  parentMenuId: string
  subTableName: string
  subTableFkName: string
  treeCode: string
  treeName: string
  treeParentCode: string
  remark: string
  createTime: string
  updateTime: string
}

function createColumn(seed: Partial<MockGenColumn> & Pick<MockGenColumn, 'columnName' | 'columnComment' | 'columnType'>, index: number): MockGenColumn {
  const javaField = seed.javaField ?? seed.columnName.replace(/_([a-z])/g, (_, p1) => p1.toUpperCase())
  return {
    columnId: seed.columnId ?? index + 1,
    tableId: seed.tableId,
    columnName: seed.columnName,
    columnComment: seed.columnComment,
    columnType: seed.columnType,
    javaType: seed.javaType ?? 'String',
    javaField,
    isPk: seed.isPk ?? '0',
    isIncrement: seed.isIncrement ?? '0',
    isRequired: seed.isRequired ?? '0',
    isInsert: seed.isInsert ?? '1',
    isEdit: seed.isEdit ?? '1',
    isList: seed.isList ?? '1',
    isQuery: seed.isQuery ?? '0',
    queryType: seed.queryType ?? 'EQ',
    htmlType: seed.htmlType ?? 'input',
    dictType: seed.dictType ?? '',
    sort: seed.sort ?? index + 1,
  }
}

export const mockDbTables: MockDbTable[] = [
  {
    tableName: 'sys_user',
    tableComment: '用户信息',
    className: 'SysUser',
    tplCategory: 'crud',
    createTime: '2026-04-01 10:00:00',
    updateTime: '2026-04-08 09:30:00',
    columns: [
      createColumn({ columnName: 'user_id', columnComment: '用户编号', columnType: 'bigint', javaType: 'Long', javaField: 'userId', isPk: '1', isIncrement: '1', isInsert: '0', isEdit: '0', isQuery: '0' }, 0),
      createColumn({ columnName: 'dept_id', columnComment: '部门编号', columnType: 'bigint', javaType: 'Long', javaField: 'deptId', isQuery: '1', queryType: 'EQ' }, 1),
      createColumn({ columnName: 'user_name', columnComment: '用户账号', columnType: 'varchar(30)', javaType: 'String', javaField: 'userName', isRequired: '1', isQuery: '1', queryType: 'LIKE' }, 2),
      createColumn({ columnName: 'nick_name', columnComment: '用户昵称', columnType: 'varchar(30)', javaType: 'String', javaField: 'nickName', isRequired: '1' }, 3),
      createColumn({ columnName: 'phonenumber', columnComment: '手机号码', columnType: 'varchar(11)', javaType: 'String', javaField: 'phonenumber', isQuery: '1', queryType: 'LIKE' }, 4),
      createColumn({ columnName: 'email', columnComment: '邮箱', columnType: 'varchar(50)', javaType: 'String', javaField: 'email' }, 5),
      createColumn({ columnName: 'sex', columnComment: '用户性别', columnType: 'char(1)', javaType: 'String', javaField: 'sex', htmlType: 'radio', dictType: 'sys_user_sex' }, 6),
      createColumn({ columnName: 'status', columnComment: '帐号状态', columnType: 'char(1)', javaType: 'String', javaField: 'status', htmlType: 'radio', dictType: 'sys_normal_disable', isQuery: '1', queryType: 'EQ' }, 7),
      createColumn({ columnName: 'create_time', columnComment: '创建时间', columnType: 'datetime', javaType: 'Date', javaField: 'createTime', htmlType: 'datetime', isInsert: '0', isEdit: '0', isQuery: '1', queryType: 'BETWEEN' }, 8),
    ],
  },
  {
    tableName: 'sys_role',
    tableComment: '角色信息',
    className: 'SysRole',
    tplCategory: 'crud',
    createTime: '2026-04-01 11:00:00',
    updateTime: '2026-04-08 09:30:00',
    columns: [
      createColumn({ columnName: 'role_id', columnComment: '角色编号', columnType: 'bigint', javaType: 'Long', javaField: 'roleId', isPk: '1', isIncrement: '1', isInsert: '0', isEdit: '0' }, 0),
      createColumn({ columnName: 'role_name', columnComment: '角色名称', columnType: 'varchar(30)', javaType: 'String', javaField: 'roleName', isRequired: '1', isQuery: '1', queryType: 'LIKE' }, 1),
      createColumn({ columnName: 'role_key', columnComment: '权限字符', columnType: 'varchar(100)', javaType: 'String', javaField: 'roleKey', isRequired: '1', isQuery: '1', queryType: 'LIKE' }, 2),
      createColumn({ columnName: 'role_sort', columnComment: '显示顺序', columnType: 'int', javaType: 'Integer', javaField: 'roleSort', isRequired: '1' }, 3),
      createColumn({ columnName: 'status', columnComment: '角色状态', columnType: 'char(1)', javaType: 'String', javaField: 'status', htmlType: 'radio', dictType: 'sys_normal_disable', isQuery: '1', queryType: 'EQ' }, 4),
      createColumn({ columnName: 'remark', columnComment: '备注', columnType: 'varchar(500)', javaType: 'String', javaField: 'remark', htmlType: 'textarea' }, 5),
    ],
  },
  {
    tableName: 'sys_notice',
    tableComment: '通知公告',
    className: 'SysNotice',
    tplCategory: 'crud',
    createTime: '2026-04-02 14:00:00',
    updateTime: '2026-04-08 09:30:00',
    columns: [
      createColumn({ columnName: 'notice_id', columnComment: '公告编号', columnType: 'int', javaType: 'Long', javaField: 'noticeId', isPk: '1', isIncrement: '1', isInsert: '0', isEdit: '0' }, 0),
      createColumn({ columnName: 'notice_title', columnComment: '公告标题', columnType: 'varchar(200)', javaType: 'String', javaField: 'noticeTitle', isRequired: '1', isQuery: '1', queryType: 'LIKE' }, 1),
      createColumn({ columnName: 'notice_type', columnComment: '公告类型', columnType: 'char(1)', javaType: 'String', javaField: 'noticeType', htmlType: 'select', dictType: 'sys_notice_type', isRequired: '1' }, 2),
      createColumn({ columnName: 'notice_content', columnComment: '公告内容', columnType: 'longtext', javaType: 'String', javaField: 'noticeContent', htmlType: 'editor', isList: '0' }, 3),
      createColumn({ columnName: 'status', columnComment: '公告状态', columnType: 'char(1)', javaType: 'String', javaField: 'status', htmlType: 'radio', dictType: 'sys_notice_status', isQuery: '1', queryType: 'EQ' }, 4),
    ],
  },
  {
    tableName: 'sys_job',
    tableComment: '定时任务',
    className: 'SysJob',
    tplCategory: 'crud',
    createTime: '2026-04-03 09:20:00',
    updateTime: '2026-04-08 09:30:00',
    columns: [
      createColumn({ columnName: 'job_id', columnComment: '任务编号', columnType: 'bigint', javaType: 'Long', javaField: 'jobId', isPk: '1', isIncrement: '1', isInsert: '0', isEdit: '0' }, 0),
      createColumn({ columnName: 'job_name', columnComment: '任务名称', columnType: 'varchar(64)', javaType: 'String', javaField: 'jobName', isRequired: '1', isQuery: '1', queryType: 'LIKE' }, 1),
      createColumn({ columnName: 'job_group', columnComment: '任务组名', columnType: 'varchar(64)', javaType: 'String', javaField: 'jobGroup', isQuery: '1', queryType: 'LIKE' }, 2),
      createColumn({ columnName: 'invoke_target', columnComment: '调用目标字符串', columnType: 'varchar(500)', javaType: 'String', javaField: 'invokeTarget', htmlType: 'textarea' }, 3),
      createColumn({ columnName: 'cron_expression', columnComment: 'cron表达式', columnType: 'varchar(255)', javaType: 'String', javaField: 'cronExpression' }, 4),
      createColumn({ columnName: 'status', columnComment: '状态', columnType: 'char(1)', javaType: 'String', javaField: 'status', htmlType: 'radio', dictType: 'sys_job_status', isQuery: '1', queryType: 'EQ' }, 5),
    ],
  },
]

export const mockGenTables: MockGenTable[] = [
  {
    tableId: 1,
    tableName: 'sys_user',
    tableComment: '用户信息',
    className: 'SysUser',
    tplCategory: 'crud',
    packageName: 'com.ruoyi.system',
    moduleName: 'system',
    businessName: 'user',
    functionName: '用户管理',
    functionAuthor: 'RuoYi Modern',
    genType: '0',
    genPath: '/',
    tplWebType: 'element-plus',
    parentMenuId: '10',
    subTableName: '',
    subTableFkName: '',
    treeCode: '',
    treeName: '',
    treeParentCode: '',
    remark: '用户信息生成配置',
    createTime: '2026-04-01 10:00:00',
    updateTime: '2026-04-08 09:30:00',
  },
  {
    tableId: 2,
    tableName: 'sys_notice',
    tableComment: '通知公告',
    className: 'SysNotice',
    tplCategory: 'crud',
    packageName: 'com.ruoyi.system',
    moduleName: 'system',
    businessName: 'notice',
    functionName: '通知公告',
    functionAuthor: 'RuoYi Modern',
    genType: '0',
    genPath: '/',
    tplWebType: 'element-plus',
    parentMenuId: '17',
    subTableName: '',
    subTableFkName: '',
    treeCode: '',
    treeName: '',
    treeParentCode: '',
    remark: '通知公告生成配置',
    createTime: '2026-04-02 14:00:00',
    updateTime: '2026-04-08 09:30:00',
  },
]

export const mockGenColumns = Object.fromEntries(mockGenTables.map((table) => {
  const dbTable = mockDbTables.find(item => item.tableName === table.tableName)
  return [table.tableId, (dbTable?.columns ?? []).map((column, index) => ({
    ...column,
    tableId: table.tableId,
    columnId: table.tableId * 100 + index + 1,
  }))]
})) as Record<number, MockGenColumn[]>

export function findMockDbTable(tableName: string) {
  return mockDbTables.find(item => item.tableName === tableName)
}

export function findMockGenTable(tableId: number) {
  return mockGenTables.find(item => item.tableId === tableId)
}

export function findMockGenColumns(tableId: number) {
  return mockGenColumns[tableId] ?? []
}