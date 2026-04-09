export interface OnlineSession {
  tokenId: string
  userName: string
  deptName: string
  ipaddr: string
  loginLocation: string
  browser: string
  os: string
  loginTime: string
}

export interface LoginLog {
  infoId: number
  userName: string
  ipaddr: string
  loginLocation: string
  browser: string
  os: string
  status: string
  msg: string
  loginTime: string
}

export interface OperLog {
  operId: number
  title: string
  businessType: number
  businessTypeName: string
  operName: string
  operIp: string
  operLocation: string
  status: number
  costTime: number
  operTime: string
  method?: string
  operParam?: string
  jsonResult?: string
}

export interface JobEntity {
  jobId: number
  jobName: string
  jobGroup: string
  invokeTarget: string
  cronExpression: string
  misfirePolicy: string
  concurrent: string
  status: string
  nextValidTime: string
  createBy: string
  createTime: string
  updateBy?: string
  updateTime?: string
  remark?: string
}

export interface JobLogEntity {
  jobLogId: number
  jobName: string
  jobGroup: string
  invokeTarget: string
  jobMessage?: string
  status: string
  exceptionInfo: string
  createTime: string
}

export const mockOnlineSessions: OnlineSession[] = [
  {
    tokenId: 'session-admin',
    userName: 'admin',
    deptName: '研发部门',
    ipaddr: '127.0.0.1',
    loginLocation: '内网',
    browser: 'Chrome 146',
    os: 'Windows 11',
    loginTime: '2026-04-08 09:20:00',
  },
  {
    tokenId: 'session-ry',
    userName: 'ry',
    deptName: '测试部门',
    ipaddr: '192.168.1.8',
    loginLocation: '内网',
    browser: 'Edge 146',
    os: 'Windows 11',
    loginTime: '2026-04-08 09:35:00',
  },
]

export const mockLoginLogs: LoginLog[] = [
  {
    infoId: 1,
    userName: 'admin',
    ipaddr: '127.0.0.1',
    loginLocation: '内网',
    browser: 'Chrome 146',
    os: 'Windows 11',
    status: '0',
    msg: '登录成功',
    loginTime: '2026-04-08 09:20:00',
  },
  {
    infoId: 2,
    userName: 'ry',
    ipaddr: '192.168.1.8',
    loginLocation: '内网',
    browser: 'Edge 146',
    os: 'Windows 11',
    status: '0',
    msg: '登录成功',
    loginTime: '2026-04-08 09:35:00',
  },
]

export const mockOperLogs: OperLog[] = [
  {
    operId: 1,
    title: '用户管理',
    businessType: 2,
    businessTypeName: '修改',
    operName: 'admin',
    operIp: '127.0.0.1',
    operLocation: '内网',
    status: 0,
    costTime: 32,
    operTime: '2026-04-08 09:25:00',
    method: 'PUT',
    operParam: '{"userId":2}',
    jsonResult: '{"code":200}',
  },
  {
    operId: 2,
    title: '代码生成',
    businessType: 1,
    businessTypeName: '新增',
    operName: 'admin',
    operIp: '127.0.0.1',
    operLocation: '内网',
    status: 0,
    costTime: 45,
    operTime: '2026-04-08 10:10:00',
    method: 'POST',
    operParam: '{"tableName":"demo_user"}',
    jsonResult: '{"code":200}',
  },
]

export const mockJobs: JobEntity[] = [
  {
    jobId: 1,
    jobName: '系统默认（无参）',
    jobGroup: 'DEFAULT',
    invokeTarget: 'ryTask.ryNoParams',
    cronExpression: '0/10 * * * * ?',
    misfirePolicy: '1',
    concurrent: '1',
    status: '1',
    nextValidTime: '2026-04-08 12:10:00',
    createBy: 'admin',
    createTime: '2026-01-18 10:58:23',
  },
  {
    jobId: 2,
    jobName: '系统默认（有参）',
    jobGroup: 'DEFAULT',
    invokeTarget: "ryTask.ryParams('ry')",
    cronExpression: '0/15 * * * * ?',
    misfirePolicy: '1',
    concurrent: '1',
    status: '0',
    nextValidTime: '2026-04-08 12:15:00',
    createBy: 'admin',
    createTime: '2026-01-18 10:58:23',
  },
]

export const mockJobLogs: JobLogEntity[] = [
  {
    jobLogId: 1,
    jobName: '系统默认（无参）',
    jobGroup: 'DEFAULT',
    invokeTarget: 'ryTask.ryNoParams',
    jobMessage: '执行成功',
    status: '0',
    exceptionInfo: '',
    createTime: '2026-04-08 11:10:00',
  },
  {
    jobLogId: 2,
    jobName: '系统默认（有参）',
    jobGroup: 'DEFAULT',
    invokeTarget: "ryTask.ryParams('ry')",
    jobMessage: '执行失败',
    status: '1',
    exceptionInfo: '示例异常信息',
    createTime: '2026-04-08 11:15:00',
  },
]

export const mockCacheNames = [
  { cacheName: 'login_tokens', remark: '登录令牌缓存' },
  { cacheName: 'captcha_codes', remark: '验证码缓存' },
]

export const mockCacheKeys: Record<string, string[]> = {
  login_tokens: ['token:admin', 'token:ry'],
  captcha_codes: ['captcha:uuid-1'],
}

export const mockCacheValues: Record<string, Record<string, unknown>> = {
  login_tokens: {
    'token:admin': { userName: 'admin', status: 'online' },
    'token:ry': { userName: 'ry', status: 'online' },
  },
  captcha_codes: {
    'captcha:uuid-1': { code: 'A7KD', expireIn: 120 },
  },
}

export const mockServerInfo = {
  cpu: { cpuNum: 8, total: 3.52, sys: 1.2, used: 2.1, wait: 0.22, free: 96.48 },
  mem: { total: 15.5, used: 6.2, free: 9.3, usage: 40.0 },
  jvm: { total: 1024, used: 256, free: 768, version: '21', home: 'C:/Java/jdk-21' },
  sys: { computerName: 'RuoYi-Modern', computerIp: '192.168.68.41', osName: 'Windows 11', osArch: 'amd64' },
  sysFiles: [
    { dirName: 'C:', sysTypeName: 'NTFS', typeName: '本地磁盘', total: '512 GB', free: '300 GB', used: '212 GB', usage: 41.4 },
  ],
}
