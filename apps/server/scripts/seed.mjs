import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const { hash } = bcrypt

const prisma = new PrismaClient()

// 这份基线数据用于快速初始化本地和测试环境，后续如调整默认菜单/角色，需要同步维护这里。
const DEPTS = [
  { deptId: 100, parentId: 0, ancestors: '0', deptName: '若依科技', orderNum: 0, leader: '若依', phone: '15888888888', email: 'ry@qq.com', status: '0' },
  { deptId: 101, parentId: 100, ancestors: '0,100', deptName: '深圳总公司', orderNum: 1, leader: '若依', phone: '15888888888', email: 'ry@qq.com', status: '0' },
  { deptId: 105, parentId: 101, ancestors: '0,100,101', deptName: '研发部门', orderNum: 1, leader: '若依', phone: '15888888888', email: 'ry@qq.com', status: '0' },
  { deptId: 106, parentId: 101, ancestors: '0,100,101', deptName: '测试部门', orderNum: 2, leader: '若依', phone: '15666666666', email: 'qa@qq.com', status: '0' },
]
const POSTS = [
  { postId: 1, postName: '董事长', postCode: 'ceo', postSort: 1, status: '0', remark: '系统默认岗位' },
  { postId: 2, postName: '项目经理', postCode: 'se', postSort: 2, status: '0', remark: '项目角色岗位' },
  { postId: 3, postName: '普通员工', postCode: 'user', postSort: 3, status: '0', remark: '基础业务岗位' },
]
const MENUS = [
  { menuId: 1, parentId: 0, menuName: '系统管理', path: '/system', component: 'Layout', menuType: 'M', perms: '', icon: 'system', orderNum: 1 },
  { menuId: 10, parentId: 1, menuName: '用户管理', path: 'user', component: 'system/user/index', menuType: 'C', perms: 'system:user:list', icon: 'user', orderNum: 1 },
  { menuId: 11, parentId: 1, menuName: '角色管理', path: 'role', component: 'system/role/index', menuType: 'C', perms: 'system:role:list', icon: 'peoples', orderNum: 2 },
  { menuId: 12, parentId: 1, menuName: '菜单管理', path: 'menu', component: 'system/menu/index', menuType: 'C', perms: 'system:menu:list', icon: 'tree-table', orderNum: 3 },
  { menuId: 13, parentId: 1, menuName: '部门管理', path: 'dept', component: 'system/dept/index', menuType: 'C', perms: 'system:dept:list', icon: 'tree', orderNum: 4 },
  { menuId: 14, parentId: 1, menuName: '岗位管理', path: 'post', component: 'system/post/index', menuType: 'C', perms: 'system:post:list', icon: 'post', orderNum: 5 },
  { menuId: 15, parentId: 1, menuName: '字典管理', path: 'dict', component: 'system/dict/index', menuType: 'C', perms: 'system:dict:list', icon: 'dict', orderNum: 6 },
  { menuId: 16, parentId: 1, menuName: '参数设置', path: 'config', component: 'system/config/index', menuType: 'C', perms: 'system:config:list', icon: 'edit', orderNum: 7 },
  { menuId: 17, parentId: 1, menuName: '通知公告', path: 'notice', component: 'system/notice/index', menuType: 'C', perms: 'system:notice:list', icon: 'message', orderNum: 8 },
  { menuId: 30, parentId: 0, menuName: '系统监控', path: '/monitor', component: 'Layout', menuType: 'M', perms: '', icon: 'monitor', orderNum: 2 },
  { menuId: 31, parentId: 30, menuName: '在线用户', path: 'online', component: 'monitor/online/index', menuType: 'C', perms: 'monitor:online:list', icon: 'online', orderNum: 1 },
  { menuId: 32, parentId: 30, menuName: '定时任务', path: 'job', component: 'monitor/job/index', menuType: 'C', perms: 'monitor:job:list', icon: 'job', orderNum: 2 },
  { menuId: 34, parentId: 30, menuName: '服务监控', path: 'server', component: 'monitor/server/index', menuType: 'C', perms: 'monitor:server:list', icon: 'server', orderNum: 4 },
  { menuId: 35, parentId: 30, menuName: '缓存监控', path: 'cache', component: 'monitor/cache/index', menuType: 'C', perms: 'monitor:cache:list', icon: 'redis', orderNum: 5 },
  { menuId: 40, parentId: 0, menuName: '系统工具', path: '/tool', component: 'Layout', menuType: 'M', perms: '', icon: 'tool', orderNum: 3 },
  { menuId: 42, parentId: 40, menuName: '代码生成', path: 'gen', component: 'tool/gen/index', menuType: 'C', perms: 'tool:gen:list', icon: 'code', orderNum: 2 },
  { menuId: 43, parentId: 40, menuName: '系统接口', path: 'swagger', component: 'tool/swagger/index', menuType: 'C', perms: 'tool:swagger:list', icon: 'swagger', orderNum: 3 }
]
const ROLES = [
  { roleId: 1, roleName: '超级管理员', roleKey: 'admin', roleSort: 1, status: '0', dataScope: '1', deptIds: [100, 101, 105, 106], menuIds: MENUS.map(v => v.menuId), remark: '系统内置角色' },
  { roleId: 2, roleName: '普通角色', roleKey: 'common', roleSort: 2, status: '0', dataScope: '5', deptIds: [105], menuIds: [1, 10, 14, 15, 17], remark: '演示角色' }
]
const USERS = [
  { userId: 1, deptId: 105, userName: 'admin', nickName: '若依', email: 'admin@example.com', phonenumber: '15888888888', sex: '1', status: '0', password: 'admin123', roleIds: [1], postIds: [1] },
  { userId: 2, deptId: 106, userName: 'ry', nickName: '若依', email: 'ry@example.com', phonenumber: '15666666666', sex: '0', status: '0', password: '123456', roleIds: [2], postIds: [3] }
]
const DICT_TYPES = [
  { dictId: 1, dictName: '用户性别', dictType: 'sys_user_sex', status: '0', remark: '用户性别列表' },
  { dictId: 2, dictName: '通知类型', dictType: 'sys_notice_type', status: '0', remark: '通知公告分类' },
  { dictId: 3, dictName: '通用状态', dictType: 'sys_normal_disable', status: '0', remark: '启用停用状态' }
]
const DICT_DATA = [
  { dictCode: 1, dictSort: 1, dictLabel: '男', dictValue: '1', dictType: 'sys_user_sex', listClass: 'default', isDefault: 'N', status: '0' },
  { dictCode: 2, dictSort: 2, dictLabel: '女', dictValue: '0', dictType: 'sys_user_sex', listClass: 'default', isDefault: 'N', status: '0' },
  { dictCode: 3, dictSort: 1, dictLabel: '通知', dictValue: '1', dictType: 'sys_notice_type', listClass: 'primary', isDefault: 'Y', status: '0' },
  { dictCode: 4, dictSort: 2, dictLabel: '公告', dictValue: '2', dictType: 'sys_notice_type', listClass: 'warning', isDefault: 'N', status: '0' },
  { dictCode: 5, dictSort: 1, dictLabel: '正常', dictValue: '0', dictType: 'sys_normal_disable', listClass: 'success', isDefault: 'Y', status: '0' },
  { dictCode: 6, dictSort: 2, dictLabel: '停用', dictValue: '1', dictType: 'sys_normal_disable', listClass: 'danger', isDefault: 'N', status: '0' }
]
const CONFIGS = [
  { configId: 1, configName: '主框架页-默认皮肤样式名称', configKey: 'sys.index.skinName', configValue: 'skin-blue', configType: 'Y', remark: '系统初始化配置' },
  { configId: 2, configName: '用户管理-账号初始密码', configKey: 'sys.user.initPassword', configValue: '123456', configType: 'Y', remark: '初始密码配置' }
]
const NOTICES = [
  { noticeId: 1, noticeTitle: '系统维护通知', noticeType: '1', noticeContent: '<h2>系统维护通知</h2><p>本周六 22:00 至 23:00 进行系统维护，请提前做好安排。</p>', status: '0', createBy: 'admin', remark: '维护通知' },
  { noticeId: 2, noticeTitle: '新功能上线公告', noticeType: '2', noticeContent: '<h2>新功能上线</h2><p>工作台、用户管理和缓存监控已经完成新版升级。</p>', status: '0', createBy: 'admin', remark: '产品公告' }
]
const JOBS = [
  { jobId: 1, jobName: '系统默认（无参）', jobGroup: 'DEFAULT', invokeTarget: 'ryTask.ryNoParams', cronExpression: '0/10 * * * * ?', misfirePolicy: '1', concurrent: '1', status: '1', remark: '默认演示任务' },
  { jobId: 2, jobName: '系统默认（有参）', jobGroup: 'DEFAULT', invokeTarget: "ryTask.ryParams('ry')", cronExpression: '0/15 * * * * ?', misfirePolicy: '1', concurrent: '1', status: '0', remark: '带参数的演示任务' }
]
const stamp = new Date('2026-01-18T10:58:15')
const upsert = async (delegate, rows, idKey, map) => { for (const row of rows) { const data = map(row); await delegate.upsert({ where: { [idKey]: row[idKey] }, update: data, create: data }) } }
const summary = () => ({ depts: DEPTS.length, posts: POSTS.length, menus: MENUS.length, roles: ROLES.length, users: USERS.length, dictTypes: DICT_TYPES.length, dictData: DICT_DATA.length, configs: CONFIGS.length, notices: NOTICES.length, jobs: JOBS.length })

async function main() {
  if (process.argv.includes('--check')) {
    console.log(JSON.stringify(summary(), null, 2))
    return
  }
  const passwordMap = new Map()
  for (const user of USERS) passwordMap.set(user.userId, await hash(user.password, 10))
  await upsert(prisma.sysDept, DEPTS, 'deptId', row => ({ ...row, delFlag: '0', createBy: 'seed', createTime: stamp, updateBy: 'seed', updateTime: new Date() }))
  await upsert(prisma.sysPost, POSTS, 'postId', row => ({ ...row, createBy: 'seed', createTime: stamp, updateBy: 'seed', updateTime: new Date() }))
  await upsert(prisma.sysMenu, MENUS, 'menuId', row => ({ ...row, query: null, routeName: null, visible: '0', status: '0', isFrame: 0, isCache: 0, perms: row.perms || null, icon: row.icon || null, createBy: 'seed', createTime: stamp, updateBy: 'seed', updateTime: new Date(), remark: '' }))
  await upsert(prisma.sysRole, ROLES, 'roleId', row => ({ roleId: row.roleId, roleName: row.roleName, roleKey: row.roleKey, roleSort: row.roleSort, dataScope: row.dataScope, menuCheckStrictly: true, deptCheckStrictly: true, status: row.status, delFlag: '0', createBy: 'seed', createTime: stamp, updateBy: 'seed', updateTime: new Date(), remark: row.remark }))
  await upsert(prisma.sysUser, USERS, 'userId', row => ({ userId: row.userId, deptId: row.deptId, userName: row.userName, nickName: row.nickName, email: row.email, phonenumber: row.phonenumber, sex: row.sex, avatar: '', password: passwordMap.get(row.userId), status: row.status, delFlag: '0', loginIp: null, loginDate: null, createBy: 'seed', createTime: stamp, updateBy: 'seed', updateTime: new Date(), remark: '' }))
  await upsert(prisma.sysDictType, DICT_TYPES, 'dictId', row => ({ ...row, createBy: 'seed', createTime: stamp, updateBy: 'seed', updateTime: new Date() }))
  await upsert(prisma.sysDictData, DICT_DATA, 'dictCode', row => ({ ...row, cssClass: '', createBy: 'seed', createTime: stamp, updateBy: 'seed', updateTime: new Date(), remark: '' }))
  await upsert(prisma.sysConfig, CONFIGS, 'configId', row => ({ ...row, createBy: 'seed', createTime: stamp, updateBy: 'seed', updateTime: new Date() }))
  await upsert(prisma.sysNotice, NOTICES, 'noticeId', row => ({ ...row, createTime: new Date('2026-04-08T09:30:00'), updateBy: 'seed', updateTime: new Date() }))
  await upsert(prisma.sysJob, JOBS, 'jobId', row => ({ ...row, nextValidTime: new Date('2026-04-08T12:10:00'), createBy: 'seed', createTime: stamp, updateBy: 'seed', updateTime: new Date() }))
  // 关系表按基线用户和角色重建，保证重复执行种子脚本时结果稳定。
  await prisma.sysUserRole.deleteMany({ where: { userId: { in: USERS.map(v => v.userId) } } })
  await prisma.sysUserPost.deleteMany({ where: { userId: { in: USERS.map(v => v.userId) } } })
  await prisma.sysRoleMenu.deleteMany({ where: { roleId: { in: ROLES.map(v => v.roleId) } } })
  await prisma.sysRoleDept.deleteMany({ where: { roleId: { in: ROLES.map(v => v.roleId) } } })
  await prisma.sysUserRole.createMany({ data: USERS.flatMap(user => user.roleIds.map(roleId => ({ userId: user.userId, roleId }))), skipDuplicates: true })
  await prisma.sysUserPost.createMany({ data: USERS.flatMap(user => user.postIds.map(postId => ({ userId: user.userId, postId }))), skipDuplicates: true })
  await prisma.sysRoleMenu.createMany({ data: ROLES.flatMap(role => role.menuIds.map(menuId => ({ roleId: role.roleId, menuId }))), skipDuplicates: true })
  await prisma.sysRoleDept.createMany({ data: ROLES.flatMap(role => role.deptIds.map(deptId => ({ roleId: role.roleId, deptId }))), skipDuplicates: true })
  console.log('RuoYi Modern 基础种子数据已完成。')
  console.log('默认账号：admin / admin123')
  console.log('演示账号：ry / 123456')
  console.log(JSON.stringify(summary(), null, 2))
}
main().catch(error => { console.error('种子数据初始化失败。'); console.error(error); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect().catch(() => undefined) })