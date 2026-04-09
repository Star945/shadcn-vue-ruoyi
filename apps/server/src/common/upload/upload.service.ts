import { BadRequestException, Injectable } from '@nestjs/common'
import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

@Injectable()
export class UploadService {
  private readonly uploadRoot = join(__dirname, '..', '..', '..', 'uploads')

  async uploadCommon(file: any) {
    const stored = await this.storeFile(file, 'common')
    return this.createResponse(stored)
  }

  async uploadAvatar(file: any) {
    const stored = await this.storeFile(file, 'avatar')
    return this.createResponse(stored)
  }

  private async storeFile(file: any, folder: string) {
    if (!file?.buffer || !file?.originalname) {
      throw new BadRequestException('请选择上传文件')
    }

    const now = new Date()
    const year = String(now.getFullYear())
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const extension = extname(String(file.originalname)) || '.bin'
    const generatedName = `${Date.now()}-${randomUUID().replace(/-/g, '').slice(0, 12)}${extension.toLowerCase()}`
    const relativePath = `/${folder}/${year}/${month}/${day}/${generatedName}`
    const targetDir = join(this.uploadRoot, folder, year, month, day)
    const absolutePath = join(targetDir, generatedName)

    await mkdir(targetDir, { recursive: true })
    await writeFile(absolutePath, file.buffer)

    const publicPath = `/profile/upload${relativePath}`
    return {
      fileName: publicPath,
      newFileName: generatedName,
      originalFilename: String(file.originalname),
      url: publicPath,
      imgUrl: publicPath,
      relativeAvatarPath: publicPath,
    }
  }

  private createResponse(payload: { fileName: string, newFileName: string, originalFilename: string, url: string, imgUrl: string }) {
    return {
      code: 200,
      msg: '操作成功',
      fileName: payload.fileName,
      newFileName: payload.newFileName,
      originalFilename: payload.originalFilename,
      url: payload.url,
      imgUrl: payload.imgUrl,
    }
  }
}