import { request } from '@/utils/request'

export function listJob(query?: Record<string, unknown>) { return request<{ code: number, msg: string, rows: any[], total: number }>({ url: '/monitor/job/list', method: 'get', params: query }) }
export function getJob(jobId: string | number) { return request<{ code: number, msg: string, data: any }>({ url: `/monitor/job/${jobId}`, method: 'get' }) }
export function addJob(data: Record<string, unknown>) { return request({ url: '/monitor/job', method: 'post', data }) }
export function updateJob(data: Record<string, unknown>) { return request({ url: '/monitor/job', method: 'put', data }) }
export function delJob(jobId: string | number) { return request({ url: `/monitor/job/${jobId}`, method: 'delete' }) }
export function changeJobStatus(jobId: string | number, status: string) { return request({ url: '/monitor/job/changeStatus', method: 'put', data: { jobId, status } }) }
export function runJob(jobId: string | number, jobGroup: string) { return request({ url: '/monitor/job/run', method: 'put', data: { jobId, jobGroup } }) }
export function exportJob(query?: Record<string, unknown>) { return request<Blob>({ url: '/monitor/job/export', method: 'get', params: query, responseType: 'blob' }) }
