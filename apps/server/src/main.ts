import 'dotenv/config'
import 'reflect-metadata'

import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { type NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'node:path'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
  })

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/profile/upload',
  })

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
  }))

  const swaggerConfig = new DocumentBuilder()
    .setTitle('RuoYi Modern Server')
    .setDescription('NestJS backend scaffold aligned with the current shadcn-vue-ruoyi frontend contract.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })

  const port = Number(process.env.PORT ?? 3000)
  await app.listen(port)
}

bootstrap()