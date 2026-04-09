export interface MockDeptNode {
  deptId: number
  parentId: number
  deptName: string
  orderNum: number
  leader: string
  phone: string
  email: string
  status: string
  children?: MockDeptNode[]
}

export interface MockRole {
  roleId: number
  roleName: string
  roleKey: string
  roleSort: number
  status: string
  dataScope: string
  menuIds: number[]
  deptIds: number[]
  createTime: string
  remark?: string
}

export interface MockPost {
  postId: number
  postName: string
  postCode: string
  postSort?: number
  status: string
  remark?: string
  createTime?: string
}

export interface MockUser {
  userId: number
  deptId: number
  userName: string
  nickName: string
  email: string
  phonenumber: string
  sex: string
  avatar: string
  status: string
  deptName: string
  password: string
  roleIds: number[]
  postIds: number[]
  createTime: string
}

export interface MockDictType {
  dictId: number
  dictName: string
  dictType: string
  status: string
  createTime: string
  remark?: string
}

export interface MockDictData {
  dictCode: number
  dictSort: number
  dictLabel: string
  dictValue: string
  dictType: string
  cssClass?: string
  listClass?: string
  isDefault: string
  status: string
  createTime: string
  remark?: string
}

export interface MockConfig {
  configId: number
  configName: string
  configKey: string
  configValue: string
  configType: string
  createTime: string
  remark?: string
}

export interface MockNotice {
  noticeId: number
  noticeTitle: string
  noticeType: string
  noticeContent: string
  status: string
  createBy: string
  createTime: string
  remark?: string
}

export interface RouterMenu {
  name?: string
  path: string
  hidden?: boolean
  redirect?: string
  component?: string
  alwaysShow?: boolean
  meta?: {
    title: string
    icon?: string
    noCache?: boolean
    link?: string | null
  }
  children?: RouterMenu[]
}

export interface MenuEntity {
  menuId: number
  parentId: number
  menuName: string
  path: string
  component: string
  menuType: 'M' | 'C' | 'F'
  visible: string
  status: string
  perms: string
  icon: string
  orderNum: number
  isFrame: number
  isCache: number
  children?: MenuEntity[]
}

export const mockDeptTree: MockDeptNode[] = [
  {
    deptId: 100,
    parentId: 0,
    deptName: '若依科技',
    orderNum: 0,
    leader: '若依',
    phone: '15888888888',
    email: 'ry@qq.com',
    status: '0',
    children: [
      {
        deptId: 101,
        parentId: 100,
        deptName: '深圳总公司',
        orderNum: 1,
        leader: '若依',
        phone: '15888888888',
        email: 'ry@qq.com',
        status: '0',
        children: [
          {
            deptId: 105,
            parentId: 101,
            deptName: '研发部门',
            orderNum: 1,
            leader: '若依',
            phone: '15888888888',
            email: 'ry@qq.com',
            status: '0',
          },
          {
            deptId: 106,
            parentId: 101,
            deptName: '测试部门',
            orderNum: 2,
            leader: '若依',
            phone: '15666666666',
            email: 'qa@qq.com',
            status: '0',
          },
        ],
      },
    ],
  },
]

export const mockPosts: MockPost[] = [
  { postId: 1, postName: '董事长', postCode: 'ceo', postSort: 1, status: '0', remark: '系统默认岗位', createTime: '2026-01-18 10:58:15' },
  { postId: 2, postName: '项目经理', postCode: 'se', postSort: 2, status: '0', remark: '项目角色岗位', createTime: '2026-01-18 10:58:15' },
  { postId: 3, postName: '普通员工', postCode: 'user', postSort: 3, status: '0', remark: '基础业务岗位', createTime: '2026-01-18 10:58:15' },
]

export const mockRoles: MockRole[] = [
  {
    roleId: 1,
    roleName: '超级管理员',
    roleKey: 'admin',
    roleSort: 1,
    status: '0',
    dataScope: '1',
    menuIds: [1, 10, 11, 12, 13, 14, 15, 16, 17, 18, 30, 31, 32, 33, 34, 35, 36, 40, 41, 42],
    deptIds: [100, 101, 105, 106],
    createTime: '2026-01-18 10:58:15',
    remark: '系统内置角色',
  },
  {
    roleId: 2,
    roleName: '普通角色',
    roleKey: 'common',
    roleSort: 2,
    status: '0',
    dataScope: '5',
    menuIds: [10, 14, 15, 17],
    deptIds: [105],
    createTime: '2026-01-18 10:58:15',
    remark: '演示角色',
  },
]

export const mockUsers: MockUser[] = [
  {
    userId: 1,
    deptId: 105,
    userName: 'admin',
    nickName: '若依',
    email: 'admin@example.com',
    phonenumber: '15888888888',
    sex: '1',
    avatar: '',
    status: '0',
    deptName: '研发部门',
    password: 'admin123',
    roleIds: [1],
    postIds: [1],
    createTime: '2026-01-18 10:58:15',
  },
  {
    userId: 2,
    deptId: 106,
    userName: 'ry',
    nickName: '若依',
    email: 'ry@example.com',
    phonenumber: '15666666666',
    sex: '0',
    avatar: '',
    status: '0',
    deptName: '测试部门',
    password: '123456',
    roleIds: [2],
    postIds: [3],
    createTime: '2026-01-18 10:58:15',
  },
]

export const mockDictTypes: MockDictType[] = [
  { dictId: 1, dictName: '用户性别', dictType: 'sys_user_sex', status: '0', createTime: '2026-01-18 10:58:15', remark: '用户性别列表' },
  { dictId: 2, dictName: '通知类型', dictType: 'sys_notice_type', status: '0', createTime: '2026-01-18 10:58:15', remark: '通知公告分类' },
]

export const mockDictData: MockDictData[] = [
  { dictCode: 1, dictSort: 1, dictLabel: '男', dictValue: '1', dictType: 'sys_user_sex', listClass: 'default', isDefault: 'N', status: '0', createTime: '2026-01-18 10:58:15', remark: '男性' },
  { dictCode: 2, dictSort: 2, dictLabel: '女', dictValue: '0', dictType: 'sys_user_sex', listClass: 'default', isDefault: 'N', status: '0', createTime: '2026-01-18 10:58:15', remark: '女性' },
  { dictCode: 3, dictSort: 1, dictLabel: '通知', dictValue: '1', dictType: 'sys_notice_type', listClass: 'primary', isDefault: 'Y', status: '0', createTime: '2026-01-18 10:58:15', remark: '通知类公告' },
  { dictCode: 4, dictSort: 2, dictLabel: '公告', dictValue: '2', dictType: 'sys_notice_type', listClass: 'warning', isDefault: 'N', status: '0', createTime: '2026-01-18 10:58:15', remark: '公告类消息' },
]

export const mockConfigs: MockConfig[] = [
  { configId: 1, configName: '主框架页-默认皮肤样式名称', configKey: 'sys.index.skinName', configValue: 'skin-blue', configType: 'Y', createTime: '2026-01-18 10:58:15', remark: '系统初始化配置' },
  { configId: 2, configName: '用户管理-账号初始密码', configKey: 'sys.user.initPassword', configValue: '123456', configType: 'Y', createTime: '2026-01-18 10:58:15', remark: '初始密码配置' },
]

export const mockNotices: MockNotice[] = [
  {
    noticeId: 1,
    noticeTitle: '系统维护通知',
    noticeType: '1',
    noticeContent: '<h2>系统维护通知</h2><p>本周六 22:00 至 23:00 进行系统维护，请提前做好安排。</p>',
    status: '0',
    createBy: 'admin',
    createTime: '2026-04-06 09:30:00',
    remark: '维护通知',
  },
  {
    noticeId: 2,
    noticeTitle: '新功能上线公告',
    noticeType: '2',
    noticeContent: '<h2>新功能上线</h2><p>工作台、用户管理和缓存监控已经完成新版升级。</p>',
    status: '0',
    createBy: 'admin',
    createTime: '2026-04-07 10:20:00',
    remark: '产品公告',
  },
]

export const mockRouterMenus: RouterMenu[] = [
  {
    path: '/',
    hidden: false,
    component: 'Layout',
    children: [
      {
        name: 'AiChat',
        path: 'aiChat',
        hidden: false,
        component: 'ai/chat',
        meta: { title: 'AI对话', icon: 'user', noCache: false, link: null },
      },
    ],
  },
  {
    name: 'System',
    path: '/system',
    hidden: false,
    redirect: 'noRedirect',
    component: 'Layout',
    alwaysShow: true,
    meta: { title: '系统管理', icon: 'system', noCache: false, link: null },
    children: [
      { name: 'User', path: 'user', hidden: false, component: 'system/user/index', meta: { title: '用户管理', icon: 'user', noCache: false, link: null } },
      { name: 'Role', path: 'role', hidden: false, component: 'system/role/index', meta: { title: '角色管理', icon: 'peoples', noCache: false, link: null } },
      { name: 'Menu', path: 'menu', hidden: false, component: 'system/menu/index', meta: { title: '菜单管理', icon: 'tree-table', noCache: false, link: null } },
      { name: 'Dept', path: 'dept', hidden: false, component: 'system/dept/index', meta: { title: '部门管理', icon: 'tree', noCache: false, link: null } },
      { name: 'Post', path: 'post', hidden: false, component: 'system/post/index', meta: { title: '岗位管理', icon: 'post', noCache: false, link: null } },
      { name: 'Dict', path: 'dict', hidden: false, component: 'system/dict/index', meta: { title: '字典管理', icon: 'dict', noCache: false, link: null } },
      { name: 'Config', path: 'config', hidden: false, component: 'system/config/index', meta: { title: '参数设置', icon: 'edit', noCache: false, link: null } },
      { name: 'Notice', path: 'notice', hidden: false, component: 'system/notice/index', meta: { title: '通知公告', icon: 'message', noCache: false, link: null } },
      {
        name: 'Log',
        path: 'log',
        hidden: false,
        redirect: 'noRedirect',
        component: 'ParentView',
        alwaysShow: true,
        meta: { title: '日志管理', icon: 'log', noCache: false, link: null },
        children: [
          { name: 'Operlog', path: 'operlog', hidden: false, component: 'monitor/operlog/index', meta: { title: '操作日志', icon: 'form', noCache: false, link: null } },
          { name: 'Logininfor', path: 'logininfor', hidden: false, component: 'monitor/logininfor/index', meta: { title: '登录日志', icon: 'logininfor', noCache: false, link: null } },
        ],
      },
    ],
  },
  {
    name: 'Monitor',
    path: '/monitor',
    hidden: false,
    redirect: 'noRedirect',
    component: 'Layout',
    alwaysShow: true,
    meta: { title: '系统监控', icon: 'monitor', noCache: false, link: null },
    children: [
      { name: 'Online', path: 'online', hidden: false, component: 'monitor/online/index', meta: { title: '在线用户', icon: 'online', noCache: false, link: null } },
      { name: 'Job', path: 'job', hidden: false, component: 'monitor/job/index', meta: { title: '定时任务', icon: 'job', noCache: false, link: null } },
      { name: 'Druid', path: 'druid', hidden: false, component: 'monitor/druid/index', meta: { title: '数据监控', icon: 'druid', noCache: false, link: null } },
      { name: 'Server', path: 'server', hidden: false, component: 'monitor/server/index', meta: { title: '服务监控', icon: 'server', noCache: false, link: null } },
      { name: 'Cache', path: 'cache', hidden: false, component: 'monitor/cache/index', meta: { title: '缓存监控', icon: 'redis', noCache: false, link: null } },
      { name: 'CacheList', path: 'cacheList', hidden: false, component: 'monitor/cache/list', meta: { title: '缓存列表', icon: 'redis-list', noCache: false, link: null } },
    ],
  },
  {
    name: 'Tool',
    path: '/tool',
    hidden: false,
    redirect: 'noRedirect',
    component: 'Layout',
    alwaysShow: true,
    meta: { title: '系统工具', icon: 'tool', noCache: false, link: null },
    children: [
      { name: 'Build', path: 'build', hidden: false, component: 'tool/build/index', meta: { title: '表单构建', icon: 'build', noCache: false, link: null } },
      { name: 'Gen', path: 'gen', hidden: false, component: 'tool/gen/index', meta: { title: '代码生成', icon: 'code', noCache: false, link: null } },
      { name: 'Swagger', path: 'swagger', hidden: false, component: 'tool/swagger/index', meta: { title: '系统接口', icon: 'swagger', noCache: false, link: null } },
    ],
  },
  {
    name: 'Http://ruoyi.vip',
    path: 'http://ruoyi.vip',
    hidden: false,
    component: 'Layout',
    meta: { title: '若依官网', icon: 'guide', noCache: false, link: 'http://ruoyi.vip' },
  },
]

export const mockMenuEntities: MenuEntity[] = [
  {
    menuId: 1,
    parentId: 0,
    menuName: '系统管理',
    path: '/system',
    component: 'Layout',
    menuType: 'M',
    visible: '0',
    status: '0',
    perms: '',
    icon: 'system',
    orderNum: 1,
    isFrame: 0,
    isCache: 0,
    children: [
      { menuId: 10, parentId: 1, menuName: '用户管理', path: 'user', component: 'system/user/index', menuType: 'C', visible: '0', status: '0', perms: 'system:user:list', icon: 'user', orderNum: 1, isFrame: 0, isCache: 0 },
      { menuId: 11, parentId: 1, menuName: '角色管理', path: 'role', component: 'system/role/index', menuType: 'C', visible: '0', status: '0', perms: 'system:role:list', icon: 'peoples', orderNum: 2, isFrame: 0, isCache: 0 },
      { menuId: 12, parentId: 1, menuName: '菜单管理', path: 'menu', component: 'system/menu/index', menuType: 'C', visible: '0', status: '0', perms: 'system:menu:list', icon: 'tree-table', orderNum: 3, isFrame: 0, isCache: 0 },
      { menuId: 13, parentId: 1, menuName: '部门管理', path: 'dept', component: 'system/dept/index', menuType: 'C', visible: '0', status: '0', perms: 'system:dept:list', icon: 'tree', orderNum: 4, isFrame: 0, isCache: 0 },
      { menuId: 14, parentId: 1, menuName: '岗位管理', path: 'post', component: 'system/post/index', menuType: 'C', visible: '0', status: '0', perms: 'system:post:list', icon: 'post', orderNum: 5, isFrame: 0, isCache: 0 },
      { menuId: 15, parentId: 1, menuName: '字典管理', path: 'dict', component: 'system/dict/index', menuType: 'C', visible: '0', status: '0', perms: 'system:dict:list', icon: 'dict', orderNum: 6, isFrame: 0, isCache: 0 },
      { menuId: 16, parentId: 1, menuName: '参数设置', path: 'config', component: 'system/config/index', menuType: 'C', visible: '0', status: '0', perms: 'system:config:list', icon: 'edit', orderNum: 7, isFrame: 0, isCache: 0 },
      { menuId: 17, parentId: 1, menuName: '通知公告', path: 'notice', component: 'system/notice/index', menuType: 'C', visible: '0', status: '0', perms: 'system:notice:list', icon: 'message', orderNum: 8, isFrame: 0, isCache: 0 },
      {
        menuId: 18,
        parentId: 1,
        menuName: '日志管理',
        path: 'log',
        component: 'ParentView',
        menuType: 'M',
        visible: '0',
        status: '0',
        perms: '',
        icon: 'log',
        orderNum: 9,
        isFrame: 0,
        isCache: 0,
        children: [
          { menuId: 19, parentId: 18, menuName: '操作日志', path: 'operlog', component: 'monitor/operlog/index', menuType: 'C', visible: '0', status: '0', perms: 'monitor:operlog:list', icon: 'form', orderNum: 1, isFrame: 0, isCache: 0 },
          { menuId: 20, parentId: 18, menuName: '登录日志', path: 'logininfor', component: 'monitor/logininfor/index', menuType: 'C', visible: '0', status: '0', perms: 'monitor:logininfor:list', icon: 'logininfor', orderNum: 2, isFrame: 0, isCache: 0 },
        ],
      },
    ],
  },
  {
    menuId: 30,
    parentId: 0,
    menuName: '系统监控',
    path: '/monitor',
    component: 'Layout',
    menuType: 'M',
    visible: '0',
    status: '0',
    perms: '',
    icon: 'monitor',
    orderNum: 2,
    isFrame: 0,
    isCache: 0,
    children: [
      { menuId: 31, parentId: 30, menuName: '在线用户', path: 'online', component: 'monitor/online/index', menuType: 'C', visible: '0', status: '0', perms: 'monitor:online:list', icon: 'online', orderNum: 1, isFrame: 0, isCache: 0 },
      { menuId: 32, parentId: 30, menuName: '定时任务', path: 'job', component: 'monitor/job/index', menuType: 'C', visible: '0', status: '0', perms: 'monitor:job:list', icon: 'job', orderNum: 2, isFrame: 0, isCache: 0 },
      { menuId: 33, parentId: 30, menuName: '数据监控', path: 'druid', component: 'monitor/druid/index', menuType: 'C', visible: '0', status: '0', perms: 'monitor:druid:list', icon: 'druid', orderNum: 3, isFrame: 0, isCache: 0 },
      { menuId: 34, parentId: 30, menuName: '服务监控', path: 'server', component: 'monitor/server/index', menuType: 'C', visible: '0', status: '0', perms: 'monitor:server:list', icon: 'server', orderNum: 4, isFrame: 0, isCache: 0 },
      { menuId: 35, parentId: 30, menuName: '缓存监控', path: 'cache', component: 'monitor/cache/index', menuType: 'C', visible: '0', status: '0', perms: 'monitor:cache:list', icon: 'redis', orderNum: 5, isFrame: 0, isCache: 0 },
      { menuId: 36, parentId: 30, menuName: '缓存列表', path: 'cacheList', component: 'monitor/cache/list', menuType: 'C', visible: '0', status: '0', perms: 'monitor:cache:list', icon: 'redis-list', orderNum: 6, isFrame: 0, isCache: 0 },
    ],
  },
  {
    menuId: 40,
    parentId: 0,
    menuName: '系统工具',
    path: '/tool',
    component: 'Layout',
    menuType: 'M',
    visible: '0',
    status: '0',
    perms: '',
    icon: 'tool',
    orderNum: 3,
    isFrame: 0,
    isCache: 0,
    children: [
      { menuId: 41, parentId: 40, menuName: '表单构建', path: 'build', component: 'tool/build/index', menuType: 'C', visible: '0', status: '0', perms: 'tool:build:list', icon: 'build', orderNum: 1, isFrame: 0, isCache: 0 },
      { menuId: 42, parentId: 40, menuName: '代码生成', path: 'gen', component: 'tool/gen/index', menuType: 'C', visible: '0', status: '0', perms: 'tool:gen:list', icon: 'code', orderNum: 2, isFrame: 0, isCache: 0 },
      { menuId: 43, parentId: 40, menuName: '系统接口', path: 'swagger', component: 'tool/swagger/index', menuType: 'C', visible: '0', status: '0', perms: 'tool:swagger:list', icon: 'swagger', orderNum: 3, isFrame: 0, isCache: 0 },
    ],
  },
]

function walkTree<T extends { children?: T[] }>(nodes: T[], visitor: (node: T) => void) {
  for (const node of nodes) {
    visitor(node)
    if (Array.isArray(node.children) && node.children.length > 0) {
      walkTree(node.children, visitor)
    }
  }
}

export function flattenDepts() {
  const rows: MockDeptNode[] = []
  walkTree(mockDeptTree, (node) => {
    rows.push(node)
  })
  return rows
}

export function flattenMenus() {
  const rows: MenuEntity[] = []
  walkTree(mockMenuEntities, (node) => {
    rows.push(node)
  })
  return rows
}

export function findDeptById(deptId: number) {
  return flattenDepts().find(item => item.deptId === deptId)
}

export function findMenuById(menuId: number) {
  return flattenMenus().find(item => item.menuId === menuId)
}

export function findRoleById(roleId: number) {
  return mockRoles.find(item => item.roleId === roleId)
}

export function findPostById(postId: number) {
  return mockPosts.find(item => item.postId === postId)
}

export function findDictTypeById(dictId: number) {
  return mockDictTypes.find(item => item.dictId === dictId)
}

export function findDictDataByCode(dictCode: number) {
  return mockDictData.find(item => item.dictCode === dictCode)
}

export function findConfigById(configId: number) {
  return mockConfigs.find(item => item.configId === configId)
}

export function findNoticeById(noticeId: number) {
  return mockNotices.find(item => item.noticeId === noticeId)
}