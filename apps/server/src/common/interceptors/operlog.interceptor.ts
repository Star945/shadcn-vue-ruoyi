import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable, catchError, tap, throwError } from 'rxjs'

import { TokenStoreService } from '../../auth/token-store.service'
import { OperlogService } from '../../monitor/operlog/operlog.service'

@Injectable()
export class OperlogInterceptor implements NestInterceptor {
  constructor(
    private readonly operlogService: OperlogService,
    private readonly tokenStore: TokenStoreService,
  ) {}

  // 这里只记录真正有业务价值的写操作和导出操作，避免把登录态探测、菜单拉取这类高频请求灌进操作日志。
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<any>()
    if (!request || !this.shouldLog(request)) {
      return next.handle()
    }

    const startedAt = Date.now()
    const session = this.tokenStore.resolveSession(request.headers?.authorization)
    const meta = this.buildMeta(request, session)

    return next.handle().pipe(
      tap((data) => {
        void this.operlogService.record({
          ...meta,
          status: 0,
          costTime: Date.now() - startedAt,
          jsonResult: this.stringifyPayload(data),
          operTime: new Date(),
        })
      }),
      catchError((error) => {
        void this.operlogService.record({
          ...meta,
          status: 1,
          costTime: Date.now() - startedAt,
          jsonResult: '',
          errorMsg: this.stringifyPayload({ message: error?.message ?? '未知异常' }),
          operTime: new Date(),
        })
        return throwError(() => error)
      }),
    )
  }

  private shouldLog(request: any) {
    const method = String(request.method ?? 'GET').toUpperCase()
    const url = String(request.originalUrl ?? '')
    if (url.startsWith('/monitor/operlog') || url.startsWith('/docs') || url.startsWith('/captchaImage') || url.startsWith('/getInfo') || url.startsWith('/getRouters') || url.startsWith('/login') || url.startsWith('/logout')) {
      return false
    }
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
      return true
    }
    return /\/(export|genCode|batchGenCode|synchDb)\b/i.test(url)
  }

  private buildMeta(request: any, session: any) {
    const url = String(request.originalUrl ?? '')
    return {
      title: this.resolveTitle(url),
      businessType: this.resolveBusinessType(request.method, url),
      method: `${String(request.method ?? '').toUpperCase()} ${String(request.route?.path ?? '')}`.trim(),
      requestMethod: String(request.method ?? '').toUpperCase(),
      operName: String(session?.userName ?? 'anonymous'),
      deptName: String(session?.deptName ?? ''),
      operUrl: url,
      operIp: String(request.ip ?? request.headers?.['x-forwarded-for'] ?? ''),
      operLocation: String(session?.loginLocation ?? '内网'),
      operParam: this.stringifyPayload({ query: request.query, body: request.body, params: request.params }),
    }
  }

  private resolveTitle(url: string) {
    const rules: Array<[string, string]> = [
      ['/system/user', '用户管理'],
      ['/system/role', '角色管理'],
      ['/system/menu', '菜单管理'],
      ['/system/dept', '部门管理'],
      ['/system/post', '岗位管理'],
      ['/system/dict', '字典管理'],
      ['/system/config', '参数设置'],
      ['/system/notice', '通知公告'],
      ['/monitor/online', '在线用户'],
      ['/monitor/logininfor', '登录日志'],
      ['/monitor/job/log', '调度日志'],
      ['/monitor/job-log', '调度日志'],
      ['/monitor/job', '定时任务'],
      ['/monitor/cache', '缓存监控'],
      ['/monitor/server', '服务监控'],
      ['/tool/gen', '代码生成'],
      ['/common/upload', '文件上传'],
    ]
    const matched = rules.find(([prefix]) => url.startsWith(prefix))
    return matched?.[1] ?? '系统操作'
  }

  // 业务类型继续沿用若依常见枚举语义，前端日志页和导出不需要再做额外映射。
  private resolveBusinessType(method: string, url: string) {
    if (/authRole|authUser/i.test(url)) return 4
    if (/\/clean\b/i.test(url)) return 9
    if (/forceLogout/i.test(url)) return 7
    if (/importTable|\/common\/upload/i.test(url)) return 6
    if (/createTable|genCode|batchGenCode/i.test(url)) return 8
    if (/\/export\b/i.test(url)) return 5
    switch (String(method ?? '').toUpperCase()) {
      case 'POST': return 1
      case 'PUT': return 2
      case 'DELETE': return 3
      default: return 0
    }
  }

  private stringifyPayload(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return ''
    }
    const normalized = value instanceof Error
      ? { message: value.message, stack: value.stack }
      : value
    const text = typeof normalized === 'string' ? normalized : JSON.stringify(normalized)
    return text.length > 4000 ? `${text.slice(0, 4000)}...` : text
  }
}