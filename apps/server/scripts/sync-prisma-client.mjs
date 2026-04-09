import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const serverRoot = process.cwd()
const pnpmRoot = resolve(serverRoot, '../../node_modules/.pnpm')
const prismaPackageDir = readdirSync(pnpmRoot).find(name => name.startsWith('@prisma+client@'))

if (!prismaPackageDir) {
  throw new Error('未找到 @prisma/client 的 pnpm 安装目录')
}

const sourceClientDir = resolve(pnpmRoot, prismaPackageDir, 'node_modules/.prisma/client')
const targetClientDir = resolve(pnpmRoot, prismaPackageDir, 'node_modules/@prisma/client/.prisma/client')

if (!existsSync(sourceClientDir)) {
  throw new Error(`未找到已生成的 Prisma Client 目录: ${sourceClientDir}`)
}

mkdirSync(dirname(targetClientDir), { recursive: true })
cpSync(sourceClientDir, targetClientDir, { recursive: true, force: true })

console.log('Prisma client artifacts synced.')
