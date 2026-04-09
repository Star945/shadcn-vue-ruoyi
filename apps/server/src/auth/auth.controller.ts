import { Body, Controller, Get, Headers, Post, Req } from '@nestjs/common'

import { Public } from '../common/decorators/public.decorator'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() payload: LoginDto, @Req() request: any) {
    const forwarded = request?.headers?.['x-forwarded-for']
    const rawIp = Array.isArray(forwarded)
      ? forwarded[0]
      : String(forwarded ?? request?.ip ?? request?.socket?.remoteAddress ?? '127.0.0.1')

    return this.authService.login(payload, {
      ipaddr: rawIp.split(',')[0]?.trim() || '127.0.0.1',
      userAgent: String(request?.headers?.['user-agent'] ?? ''),
    })
  }

  @Public()
  @Post('register')
  register(@Body() payload: RegisterDto) {
    return this.authService.register(payload)
  }

  @Post('logout')
  logout(@Headers('authorization') authorization?: string) {
    return this.authService.logout(authorization)
  }

  @Get('getInfo')
  getInfo(@Headers('authorization') authorization?: string) {
    return this.authService.getInfo(authorization)
  }

  @Get('getRouters')
  getRouters(@Headers('authorization') authorization?: string) {
    return this.authService.getRouters(authorization)
  }

  @Public()
  @Get('captchaImage')
  captchaImage() {
    return this.authService.getCaptchaImage()
  }

  @Post('unlockscreen')
  unlockscreen(@Body('password') password: string, @Headers('authorization') authorization?: string) {
    return this.authService.unlockscreen(password, authorization)
  }
}

