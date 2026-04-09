import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { TokenStoreService } from '../../auth/token-store.service'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenStore: TokenStoreService,
  ) {}

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const session = this.tokenStore.resolveSession(request.headers?.authorization)
    if (!session) {
      throw new UnauthorizedException('未登录或登录状态已失效')
    }

    request.user = session
    return true
  }
}
