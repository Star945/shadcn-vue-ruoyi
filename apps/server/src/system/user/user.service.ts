import { Injectable } from '@nestjs/common'
import { compare, hash } from 'bcryptjs'

import { TokenStoreService } from '../../auth/token-store.service'
import { createCsvBuffer } from '../../common/export/csv.util'
import { success, table } from '../../common/http/ruoyi-response'
import { UploadService } from '../../common/upload/upload.service'
import { PrismaService } from '../../infra/prisma/prisma.service'
import { findDeptById, mockDeptTree, mockPosts, mockRoles, mockUsers } from '../../mock/ruoyi.mock'

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenStore: TokenStoreService,
    private readonly uploadService: UploadService,
  ) {}

  async list(query: Record<string, unknown>) {
    const paginate = query.pageNum !== undefined || query.pageSize !== undefined
    const pageNum = this.parsePositiveNumber(query.pageNum, 1)
    const pageSize = this.parsePositiveNumber(query.pageSize, 10)
    const where = {
      delFlag: '0',
      ...(query.userName ? { userName: { contains: String(query.userName) } } : {}),
      ...(query.phonenumber ? { phonenumber: { contains: String(query.phonenumber) } } : {}),
      ...(query.status ? { status: String(query.status) } : {}),
      ...(query.deptId ? { deptId: Number(query.deptId) } : {}),
    }

    const dbRows = await this.prisma.safeCall(async () => {
      const total = await this.prisma.sysUser.count({ where })
      const items = await this.prisma.sysUser.findMany({
        where,
        include: {
          dept: true,
        },
        orderBy: [
          { userId: 'asc' },
        ],
        ...(paginate ? { skip: (pageNum - 1) * pageSize, take: pageSize } : {}),
      })

      return {
        total,
        rows: items.map(user => ({
          ...user,
          deptName: user.dept?.deptName ?? '--',
          dept: user.dept,
        })),
      }
    })

    if (dbRows) {
      return table(dbRows.rows, dbRows.total)
    }

    const rows = mockUsers.filter((user) => {
      const matchesUserName = !query.userName || user.userName.includes(String(query.userName))
      const matchesPhone = !query.phonenumber || user.phonenumber.includes(String(query.phonenumber))
      const matchesStatus = !query.status || user.status === String(query.status)
      const matchesDept = !query.deptId || user.deptId === Number(query.deptId)
      return matchesUserName && matchesPhone && matchesStatus && matchesDept
    }).map((user) => {
      const dept = findDeptById(user.deptId)
      return {
        ...user,
        deptName: dept?.deptName ?? user.deptName,
        dept,
      }
    })

    return table(paginate ? this.slicePage(rows, pageNum, pageSize) : rows, rows.length)
  }

  async get(userId?: number) {
    if (!userId) {
      const dbMeta = await this.prisma.safeCall(async () => {
        const [roles, posts] = await Promise.all([
          this.prisma.sysRole.findMany({ where: { delFlag: '0' }, orderBy: [{ roleSort: 'asc' }, { roleId: 'asc' }] }),
          this.prisma.sysPost.findMany({ orderBy: [{ postSort: 'asc' }, { postId: 'asc' }] }),
        ])
        return { roles, posts }
      })

      if (dbMeta) {
        return {
          code: 200,
          msg: '操作成功',
          roles: dbMeta.roles,
          posts: dbMeta.posts,
        }
      }

      return {
        code: 200,
        msg: '操作成功',
        roles: mockRoles,
        posts: mockPosts,
      }
    }

    const dbDetail = await this.prisma.safeCall(async () => {
      const [user, roles, posts] = await Promise.all([
        this.prisma.sysUser.findFirst({
          where: { userId, delFlag: '0' },
          include: {
            dept: true,
            userRoles: { include: { role: true } },
            userPosts: { include: { post: true } },
          },
        }),
        this.prisma.sysRole.findMany({ where: { delFlag: '0' }, orderBy: [{ roleSort: 'asc' }, { roleId: 'asc' }] }),
        this.prisma.sysPost.findMany({ orderBy: [{ postSort: 'asc' }, { postId: 'asc' }] }),
      ])

      return {
        data: user,
        roles,
        posts,
        roleIds: user?.userRoles.map(item => item.roleId) ?? [],
        postIds: user?.userPosts.map(item => item.postId) ?? [],
      }
    })

    if (dbDetail) {
      return {
        code: 200,
        msg: '操作成功',
        ...dbDetail,
      }
    }

    const user = mockUsers.find(item => item.userId === userId)
    return {
      code: 200,
      msg: '操作成功',
      data: user,
      roles: mockRoles,
      posts: mockPosts,
      roleIds: user?.roleIds ?? [],
      postIds: user?.postIds ?? [],
    }
  }

  async profile(authorization?: string) {
    const userId = this.tokenStore.resolveUserId(authorization)
    if (userId) {
      const dbProfile = await this.prisma.safeCall(async () => {
        const user = await this.prisma.sysUser.findFirst({
          where: { userId, delFlag: '0' },
          include: {
            dept: true,
            userRoles: { include: { role: true } },
            userPosts: { include: { post: true } },
          },
        })
        if (!user) {
          return undefined
        }
        return {
          data: user,
          roleGroup: user.userRoles.map(item => item.role?.roleName).filter(Boolean).join(' / '),
          postGroup: user.userPosts.map(item => item.post?.postName).filter(Boolean).join(' / '),
          isDefaultModifyPwd: false,
          isPasswordExpired: false,
        }
      })

      if (dbProfile) {
        return {
          code: 200,
          msg: '操作成功',
          ...dbProfile,
        }
      }
    }

    const user = mockUsers.find(item => item.userId === userId) ?? mockUsers[0]
    return {
      code: 200,
      msg: '操作成功',
      data: user,
      roleGroup: '超级管理员',
      postGroup: '董事长',
      isDefaultModifyPwd: false,
      isPasswordExpired: false,
    }
  }

  async authRole(userId: number) {
    const dbAuthRole = await this.prisma.safeCall(async () => {
      const [user, roles] = await Promise.all([
        this.prisma.sysUser.findFirst({
          where: { userId, delFlag: '0' },
          include: { userRoles: true },
        }),
        this.prisma.sysRole.findMany({ where: { delFlag: '0' }, orderBy: [{ roleSort: 'asc' }, { roleId: 'asc' }] }),
      ])

      return {
        user,
        roles: roles.map(role => ({
          ...role,
          flag: Boolean(user?.userRoles.some(item => item.roleId === role.roleId)),
        })),
      }
    })

    if (dbAuthRole) {
      return {
        code: 200,
        msg: '操作成功',
        ...dbAuthRole,
      }
    }

    const user = mockUsers.find(item => item.userId === userId)
    const roles = mockRoles.map((role) => ({
      ...role,
      flag: Boolean(user?.roleIds.includes(role.roleId)),
    }))

    return {
      code: 200,
      msg: '操作成功',
      user,
      roles,
    }
  }

  async deptTree() {
    const dbRows = await this.prisma.safeCall(() => this.prisma.sysDept.findMany({
      where: { delFlag: '0' },
      orderBy: [
        { parentId: 'asc' },
        { orderNum: 'asc' },
        { deptId: 'asc' },
      ],
    }))

    if (dbRows !== undefined) {
      return success(dbRows)
    }

    return success(mockDeptTree)
  }

  async create(payload: Record<string, unknown>) {
    const created = await this.prisma.safeCall(async () => {
      const roleIds = this.parseIdList(payload.roleIds)
      const postIds = this.parseIdList(payload.postIds)
      const password = await hash(String(payload.password ?? '123456'), 10)
      const createdUser = await this.prisma.sysUser.create({
        data: {
          deptId: this.parseOptionalNumber(payload.deptId),
          userName: String(payload.userName ?? ''),
          nickName: String(payload.nickName ?? ''),
          email: this.toOptionalString(payload.email),
          phonenumber: this.toOptionalString(payload.phonenumber),
          sex: String(payload.sex ?? '0'),
          avatar: '',
          password,
          status: String(payload.status ?? '0'),
          delFlag: '0',
          remark: this.toOptionalString(payload.remark),
          createTime: new Date(),
        },
      })

      if (roleIds.length > 0) {
        await this.prisma.sysUserRole.createMany({
          data: roleIds.map(roleId => ({ userId: createdUser.userId, roleId })),
          skipDuplicates: true,
        })
      }

      if (postIds.length > 0) {
        await this.prisma.sysUserPost.createMany({
          data: postIds.map(postId => ({ userId: createdUser.userId, postId })),
          skipDuplicates: true,
        })
      }

      return true
    })

    if (created) {
      return success(undefined, '新增成功')
    }

    const nextUserId = mockUsers.reduce((max, item) => Math.max(max, item.userId), 0) + 1
    const deptId = this.parseOptionalNumber(payload.deptId) ?? 0
    const dept = deptId ? findDeptById(deptId) : undefined
    mockUsers.push({
      userId: nextUserId,
      deptId,
      userName: String(payload.userName ?? ''),
      nickName: String(payload.nickName ?? ''),
      email: String(payload.email ?? ''),
      phonenumber: String(payload.phonenumber ?? ''),
      sex: String(payload.sex ?? '0'),
      avatar: '',
      status: String(payload.status ?? '0'),
      deptName: dept?.deptName ?? '--',
      password: String(payload.password ?? '123456'),
      roleIds: this.parseIdList(payload.roleIds),
      postIds: this.parseIdList(payload.postIds),
      createTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })

    return success(undefined, '新增成功')
  }

  async update(payload: Record<string, unknown>) {
    const updated = await this.prisma.safeCall(async () => {
      const userId = Number(payload.userId)
      const roleIds = this.parseIdList(payload.roleIds)
      const postIds = this.parseIdList(payload.postIds)

      const data: Record<string, unknown> = {
        deptId: this.parseOptionalNumber(payload.deptId),
        userName: String(payload.userName ?? ''),
        nickName: String(payload.nickName ?? ''),
        email: this.toOptionalString(payload.email),
        phonenumber: this.toOptionalString(payload.phonenumber),
        sex: String(payload.sex ?? '0'),
        status: String(payload.status ?? '0'),
        remark: this.toOptionalString(payload.remark),
        updateTime: new Date(),
      }

      if (payload.password) {
        data.password = await hash(String(payload.password), 10)
      }

      await this.prisma.sysUser.update({ where: { userId }, data })
      await this.prisma.sysUserRole.deleteMany({ where: { userId } })
      await this.prisma.sysUserPost.deleteMany({ where: { userId } })

      if (roleIds.length > 0) {
        await this.prisma.sysUserRole.createMany({
          data: roleIds.map(roleId => ({ userId, roleId })),
          skipDuplicates: true,
        })
      }

      if (postIds.length > 0) {
        await this.prisma.sysUserPost.createMany({
          data: postIds.map(postId => ({ userId, postId })),
          skipDuplicates: true,
        })
      }

      return true
    })

    if (updated) {
      return success(undefined, '修改成功')
    }

    const userId = Number(payload.userId)
    const current = mockUsers.find(item => item.userId === userId)
    if (current) {
      const deptId = this.parseOptionalNumber(payload.deptId) ?? current.deptId
      const dept = deptId ? findDeptById(deptId) : undefined
      current.deptId = deptId
      current.userName = String(payload.userName ?? current.userName)
      current.nickName = String(payload.nickName ?? current.nickName)
      current.email = String(payload.email ?? current.email)
      current.phonenumber = String(payload.phonenumber ?? current.phonenumber)
      current.sex = String(payload.sex ?? current.sex)
      current.status = String(payload.status ?? current.status)
      current.deptName = dept?.deptName ?? current.deptName
      current.roleIds = this.parseIdList(payload.roleIds)
      current.postIds = this.parseIdList(payload.postIds)
      if (payload.password) {
        current.password = String(payload.password)
      }
    }

    return success(undefined, '修改成功')
  }

  async remove(userId: number) {
    const removed = await this.prisma.safeCall(async () => {
      await this.prisma.sysUserRole.deleteMany({ where: { userId } })
      await this.prisma.sysUserPost.deleteMany({ where: { userId } })
      await this.prisma.sysUser.update({
        where: { userId },
        data: {
          delFlag: '2',
          updateTime: new Date(),
        },
      })
      return true
    })

    if (removed) {
      return success(undefined, '删除成功')
    }

    const index = mockUsers.findIndex(item => item.userId === userId)
    if (index >= 0) {
      mockUsers.splice(index, 1)
    }

    return success(undefined, '删除成功')
  }

  async export(query: Record<string, unknown>) {
    const exportQuery = { ...query }
    delete exportQuery.pageNum
    delete exportQuery.pageSize
    const result = await this.list(exportQuery) as Record<string, any>
    const rows = Array.isArray(result.rows) ? result.rows : []
    return {
      fileName: 'system-user.csv',
      buffer: createCsvBuffer(rows, [
        { key: 'userId', title: '用户编号' },
        { key: 'userName', title: '用户名称' },
        { key: 'nickName', title: '用户昵称' },
        { key: 'deptName', title: '部门' },
        { key: 'phonenumber', title: '手机号码' },
        { key: 'status', title: '状态' },
        { key: 'createTime', title: '创建时间' },
      ]),
    }
  }

  async resetPassword(payload: Record<string, unknown>) {
    const updated = await this.prisma.safeCall(async () => {
      await this.prisma.sysUser.update({
        where: { userId: Number(payload.userId) },
        data: {
          password: await hash(String(payload.password ?? ''), 10),
          updateTime: new Date(),
        },
      })
      return true
    })

    if (updated) {
      return success(undefined, '密码重置成功')
    }

    return success(undefined, '密码重置成功')
  }

  async changeStatus(payload: Record<string, unknown>) {
    const updated = await this.prisma.safeCall(async () => {
      await this.prisma.sysUser.update({
        where: { userId: Number(payload.userId) },
        data: {
          status: String(payload.status ?? '0'),
          updateTime: new Date(),
        },
      })
      return true
    })

    if (updated) {
      return success(undefined, '状态更新成功')
    }

    const current = mockUsers.find(item => item.userId === Number(payload.userId))
    if (current) {
      current.status = String(payload.status ?? current.status)
    }

    return success(undefined, '状态更新成功')
  }

  async updateProfile(authorization: string | undefined, payload: Record<string, unknown>) {
    const userId = this.tokenStore.resolveUserId(authorization)
    if (userId) {
      const updated = await this.prisma.safeCall(async () => {
        await this.prisma.sysUser.update({
          where: { userId },
          data: {
            nickName: String(payload.nickName ?? ''),
            email: this.toOptionalString(payload.email),
            phonenumber: this.toOptionalString(payload.phonenumber),
            sex: String(payload.sex ?? '0'),
            updateTime: new Date(),
          },
        })
        return true
      })

      if (!updated) {
        const current = mockUsers.find(item => item.userId === userId)
        if (current) {
          current.nickName = String(payload.nickName ?? current.nickName)
          current.email = String(payload.email ?? current.email)
          current.phonenumber = String(payload.phonenumber ?? current.phonenumber)
          current.sex = String(payload.sex ?? current.sex)
        }
      }
    }
    return success(undefined, '个人资料更新成功')
  }

  async updatePassword(authorization: string | undefined, payload: Record<string, unknown>) {
    const userId = this.tokenStore.resolveUserId(authorization)
    if (userId) {
      const updated = await this.prisma.safeCall(async () => {
        const user = await this.prisma.sysUser.findFirst({ where: { userId, delFlag: '0' } })
        if (!user) {
          return false
        }

        const matches = await this.verifyPassword(String(payload.oldPassword ?? ''), user.password)
        if (!matches) {
          return false
        }

        const nextPassword = await hash(String(payload.newPassword ?? ''), 10)
        await this.prisma.sysUser.update({
          where: { userId },
          data: {
            password: nextPassword,
            updateTime: new Date(),
          },
        })
        return true
      })

      if (updated) {
        return success(undefined, '密码修改成功')
      }

      const current = mockUsers.find(item => item.userId === userId)
      if (!current) {
        return success(undefined, '密码修改成功')
      }

      const matches = await this.verifyPassword(String(payload.oldPassword ?? ''), current.password)
      if (!matches) {
        return success(undefined, '原密码错误')
      }

      current.password = String(payload.newPassword ?? '')
    }
    return success(undefined, '密码修改成功')
  }

  async updateAvatar(authorization: string | undefined, file: any) {
    const uploaded = await this.uploadService.uploadAvatar(file)
    const userId = this.tokenStore.resolveUserId(authorization)
    if (userId) {
      const updated = await this.prisma.safeCall(async () => {
        await this.prisma.sysUser.update({
          where: { userId },
          data: {
            avatar: String(uploaded.fileName ?? ''),
            updateTime: new Date(),
          },
        })
        return true
      })

      if (!updated) {
        const current = mockUsers.find(item => item.userId === userId)
        if (current) {
          current.avatar = String(uploaded.fileName ?? '')
        }
      }
    }
    return uploaded
  }

  async updateAuthRole(payload: Record<string, unknown>) {
    const userId = Number(payload.userId)
    const roleIds = this.parseIdList(payload.roleIds)

    const updated = await this.prisma.safeCall(async () => {
      await this.prisma.sysUserRole.deleteMany({ where: { userId } })
      if (roleIds.length > 0) {
        await this.prisma.sysUserRole.createMany({
          data: roleIds.map(roleId => ({ userId, roleId })),
          skipDuplicates: true,
        })
      }
      return true
    })

    if (updated) {
      return success(undefined, '授权成功')
    }

    const current = mockUsers.find(item => item.userId === userId)
    if (current) {
      current.roleIds = roleIds
    }

    return success(undefined, '授权成功')
  }

  private toOptionalString(value: unknown) {
    const text = String(value ?? '').trim()
    return text ? text : null
  }

  private parseOptionalNumber(value: unknown) {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }

  private parseIdList(value: unknown) {
    if (Array.isArray(value)) {
      return value
        .map(item => Number(item))
        .filter(item => Number.isFinite(item) && item > 0)
    }

    const text = String(value ?? '').trim()
    if (!text) {
      return []
    }

    return text
      .split(',')
      .map(item => Number(item.trim()))
      .filter(item => Number.isFinite(item) && item > 0)
  }

  private async verifyPassword(plainText: string, storedPassword: string) {
    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$')) {
      return compare(plainText, storedPassword)
    }
    return plainText === storedPassword
  }

  private parsePositiveNumber(value: unknown, fallback: number) {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
  }

  private slicePage<T>(rows: T[], pageNum: number, pageSize: number) {
    const start = (pageNum - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }
}