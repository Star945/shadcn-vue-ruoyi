import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { compare, hash } from 'bcryptjs'

import { success } from '../common/http/ruoyi-response'
import { PrismaService } from '../infra/prisma/prisma.service'
import { mockLoginLogs } from '../mock/monitor.mock'
import { findDeptById, mockRoles, mockRouterMenus, mockUsers } from '../mock/ruoyi.mock'
import { buildRouterTree, collectPermissions } from './auth.utils'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { TokenStoreService } from './token-store.service'

interface LoginContext {
  ipaddr?: string
  userAgent?: string
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenStore: TokenStoreService,
  ) {}

  async login(payload: LoginDto, context: LoginContext = {}) {
    const sessionMeta = this.resolveSessionMeta(context)
        // 认证链路始终先走真实数据源，只在 Prisma 不可用时回退到 mock，这样同一套服务既能联调也能逐步过渡到真库。
    const dbUser = await this.prisma.safeCall(() => this.prisma.sysUser.findFirst({
      where: {
        userName: payload.username,
        delFlag: '0',
      },
      include: {
        dept: true,
        userRoles: {
          include: {
            role: true,
          },
        },
        userPosts: {
          include: {
            post: true,
          },
        },
      },
    }))

    if (dbUser) {
      if (dbUser.status !== '0') {
        await this.recordLogininfor({
          userName: dbUser.userName,
          ...sessionMeta,
          status: '1',
          msg: '当前账号已停用',
        })
        throw new UnauthorizedException('当前账号已停用')
      }

      const passwordMatched = await this.verifyPassword(payload.password, dbUser.password)
      if (!passwordMatched) {
        await this.recordLogininfor({
          userName: dbUser.userName,
          ...sessionMeta,
          status: '1',
          msg: '用户名或密码错误',
        })
        throw new UnauthorizedException('用户名或密码错误')
      }

      await this.prisma.safeCall(() => this.prisma.sysUser.update({
        where: { userId: dbUser.userId },
        data: {
          loginIp: sessionMeta.ipaddr,
          loginDate: new Date(),
        },
      }))

      await this.recordLogininfor({
        userName: dbUser.userName,
        ...sessionMeta,
        status: '0',
        msg: '登录成功',
      })

      return {
        code: 200,
        msg: '操作成功',
        token: this.tokenStore.issue({
          userId: dbUser.userId,
          userName: dbUser.userName,
          deptName: dbUser.dept?.deptName ?? '',
          ...sessionMeta,
        }),
      }
    }

    const user = mockUsers.find(item => item.userName === payload.username)
    if (!user || user.password !== payload.password) {
      await this.recordLogininfor({
        userName: payload.username,
        ...sessionMeta,
        status: '1',
        msg: '用户名或密码错误',
      })
      throw new UnauthorizedException('用户名或密码错误')
    }

    await this.recordLogininfor({
      userName: user.userName,
      ...sessionMeta,
      status: '0',
      msg: '登录成功',
    })

    return {
      code: 200,
      msg: '操作成功',
      token: this.tokenStore.issue({
        userId: user.userId,
        userName: user.userName,
        deptName: findDeptById(user.deptId)?.deptName ?? user.deptName ?? '',
        ...sessionMeta,
      }),
    }
  }

  async register(payload: RegisterDto) {
    const created = await this.prisma.safeCall(async () => {
      const exists = await this.prisma.sysUser.findFirst({
        where: {
          userName: payload.username,
          delFlag: '0',
        },
      })
      if (exists) {
        throw new BadRequestException('用户名已存在')
      }

      const password = await hash(payload.password, 10)
      await this.prisma.sysUser.create({
        data: {
          userName: payload.username,
          nickName: payload.nickName?.trim() || payload.username,
          email: payload.email?.trim() || null,
          phonenumber: payload.phonenumber?.trim() || null,
          sex: '0',
          avatar: '',
          password,
          status: '0',
          delFlag: '0',
          createTime: new Date(),
        },
      })
      return true
    })

    if (created) {
      return success(undefined, '注册成功')
    }

    return success(undefined, '注册成功')
  }

  logout(authorization?: string) {
    this.tokenStore.revoke(authorization)
    return success(undefined, '退出成功')
  }

  async getInfo(authorization?: string) {
    const authUser = await this.resolveAuthUser(authorization)
    if (!authUser) {
      throw new UnauthorizedException('未登录或登录状态已失效')
    }

    return {
      code: 200,
      msg: '操作成功',
      permissions: authUser.permissions,
      roles: authUser.roles,
      user: authUser.user,
      roleGroup: authUser.roleGroup,
      postGroup: authUser.postGroup,
      isDefaultModifyPwd: false,
      isPasswordExpired: false,
    }
  }

  async getRouters(authorization?: string) {
    const authUser = await this.resolveAuthUser(authorization)
    if (!authUser) {
      throw new UnauthorizedException('未登录或登录状态已失效')
    }

    return {
      code: 200,
      msg: '操作成功',
      data: authUser.routers,
    }
  }

  getCaptchaImage() {
    return {
      code: 200,
      msg: '操作成功',
      captchaEnabled: false,
      uuid: 'mock-captcha-uuid',
      img: '',
    }
  }

  async unlockscreen(password: string, authorization?: string) {
    const authUser = await this.resolveAuthUser(authorization)
    const storedPassword = authUser?.rawPassword
    if (!storedPassword || !(await this.verifyPassword(password, storedPassword))) {
      throw new UnauthorizedException('解锁密码错误')
    }
    return success(undefined, '解锁成功')
  }

    // getInfo/getRouters 都经过这里，所以用户、角色、权限、菜单树的聚合逻辑集中放在一处维护。
  private async resolveAuthUser(authorization?: string) {
    const userId = this.tokenStore.resolveUserId(authorization)
    if (!userId) {
      return undefined
    }

    const dbUser = await this.prisma.safeCall(async () => {
      const user = await this.prisma.sysUser.findFirst({
        where: {
          userId,
          delFlag: '0',
        },
        include: {
          dept: true,
          userRoles: {
            include: {
              role: true,
            },
          },
          userPosts: {
            include: {
              post: true,
            },
          },
        },
      })

      if (!user) {
        return undefined
      }

      const roles = user.userRoles.map(item => item.role).filter(Boolean)
      const roleKeys = roles.map(role => role.roleKey)
      const roleIds = roles.map(role => role.roleId)
      const isAdmin = roleKeys.includes('admin') || user.userId === 1

      const permissionMenus = await this.prisma.sysMenu.findMany({
        where: isAdmin
          ? { status: '0' }
          : {
              status: '0',
              roleMenus: {
                some: {
                  roleId: { in: roleIds },
                },
              },
            },
        orderBy: [
          { parentId: 'asc' },
          { orderNum: 'asc' },
        ],
      })

      const routerMenus = permissionMenus.filter(menu => menu.menuType === 'M' || menu.menuType === 'C')
      const postGroup = user.userPosts.map(item => item.post?.postName).filter(Boolean).join(' / ') || ''

      return {
        permissions: isAdmin ? ['*:*:*'] : collectPermissions(permissionMenus),
        roles: roleKeys.length ? roleKeys : ['common'],
        roleGroup: roles.map(role => role.roleName).join(' / ') || '',
        postGroup,
        rawPassword: user.password,
        routers: buildRouterTree(routerMenus.map(menu => ({
          menuId: menu.menuId,
          parentId: menu.parentId,
          menuName: menu.menuName,
          path: menu.path,
          component: menu.component,
          routeName: menu.routeName,
          visible: menu.visible,
          icon: menu.icon,
          isCache: menu.isCache,
          isFrame: menu.isFrame,
          menuType: menu.menuType,
          orderNum: menu.orderNum,
        }))),
        user: {
          userId: user.userId,
          deptId: user.deptId,
          userName: user.userName,
          nickName: user.nickName,
          avatar: user.avatar,
          email: user.email,
          phonenumber: user.phonenumber,
          dept: user.dept,
        },
      }
    })

    if (dbUser) {
      return dbUser
    }

    const mockUser = mockUsers.find(item => item.userId === userId)
    if (!mockUser) {
      return undefined
    }

    const roles = mockRoles.filter(role => mockUser.roleIds.includes(role.roleId))
    const roleKeys = roles.map(role => role.roleKey)

    return {
      permissions: roleKeys.includes('admin') || mockUser.userId === 1 ? ['*:*:*'] : [],
      roles: roleKeys.length ? roleKeys : ['common'],
      roleGroup: roles.map(role => role.roleName).join(' / ') || '',
      postGroup: '',
      rawPassword: mockUser.password,
      routers: mockRouterMenus,
      user: {
        userId: mockUser.userId,
        deptId: mockUser.deptId,
        userName: mockUser.userName,
        nickName: mockUser.nickName,
        avatar: mockUser.avatar,
        email: mockUser.email,
        phonenumber: mockUser.phonenumber,
      },
    }
  }

  private async verifyPassword(plainText: string, storedPassword: string) {
    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$')) {
      return compare(plainText, storedPassword)
    }
    return plainText === storedPassword
  }

  private resolveSessionMeta(context: LoginContext) {
    const { browser, os } = this.parseUserAgent(context.userAgent ?? '')
    return {
      ipaddr: context.ipaddr || '127.0.0.1',
      loginLocation: '内网',
      browser,
      os,
      loginTime: new Date().toISOString(),
    }
  }

  // 登录日志同时支持数据库和内存回退，确保前后端在无库环境也能完整验证监控链路。
  private async recordLogininfor(payload: {
    userName: string
    ipaddr?: string
    loginLocation?: string
    browser?: string
    os?: string
    loginTime?: string
    status: string
    msg: string
  }) {
    const created = await this.prisma.safeCall(() => this.prisma.sysLogininfor.create({
      data: {
        userName: payload.userName,
        ipaddr: payload.ipaddr ?? '127.0.0.1',
        loginLocation: payload.loginLocation ?? '内网',
        browser: payload.browser ?? 'Unknown',
        os: payload.os ?? 'Unknown',
        status: payload.status,
        msg: payload.msg,
        loginTime: payload.loginTime ? new Date(payload.loginTime) : new Date(),
      },
    }))

    if (created) {
      return
    }

    const nextId = Math.max(0, ...mockLoginLogs.map(item => item.infoId)) + 1
    mockLoginLogs.unshift({
      infoId: nextId,
      userName: payload.userName,
      ipaddr: payload.ipaddr ?? '127.0.0.1',
      loginLocation: payload.loginLocation ?? '内网',
      browser: payload.browser ?? 'Unknown',
      os: payload.os ?? 'Unknown',
      status: payload.status,
      msg: payload.msg,
      loginTime: payload.loginTime ? this.formatDateTime(payload.loginTime) : this.formatDateTime(new Date()),
    })
  }

  private parseUserAgent(userAgent: string) {
    const source = userAgent.toLowerCase()
    return {
      browser: this.extractBrowser(source),
      os: this.extractOs(source),
    }
  }

  private formatDateTime(value: unknown) {
    if (!value) {
      return ''
    }
    const date = value instanceof Date ? value : new Date(String(value))
    if (Number.isNaN(date.getTime())) {
      return String(value)
    }
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  private extractBrowser(userAgent: string) {
    if (userAgent.includes('edg/')) {
      return `Edge ${this.extractVersion(userAgent, 'edg/')}`
    }
    if (userAgent.includes('chrome/')) {
      return `Chrome ${this.extractVersion(userAgent, 'chrome/')}`
    }
    if (userAgent.includes('firefox/')) {
      return `Firefox ${this.extractVersion(userAgent, 'firefox/')}`
    }
    if (userAgent.includes('safari/') && userAgent.includes('version/')) {
      return `Safari ${this.extractVersion(userAgent, 'version/')}`
    }
    return 'Unknown'
  }

  private extractOs(userAgent: string) {
    if (userAgent.includes('windows nt 10.0')) {
      return 'Windows 10/11'
    }
    if (userAgent.includes('windows')) {
      return 'Windows'
    }
    if (userAgent.includes('android')) {
      return `Android ${this.extractVersion(userAgent, 'android ')}`
    }
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'iOS'
    }
    if (userAgent.includes('mac os x')) {
      return 'macOS'
    }
    if (userAgent.includes('linux')) {
      return 'Linux'
    }
    return 'Unknown'
  }

  private extractVersion(userAgent: string, marker: string) {
    const start = userAgent.indexOf(marker)
    if (start < 0) {
      return ''
    }
    const version = userAgent.slice(start + marker.length).split(/[\s;)]/)[0]
    return version || ''
  }
}