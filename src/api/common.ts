import { request } from '@/utils/request'

export function uploadCommonFile(data: FormData) {
  return request<{ code: number, msg: string, fileName?: string, url?: string, imgUrl?: string, newFileName?: string, originalFilename?: string }>({
    url: '/common/upload',
    method: 'post',
    data,
  })
}
