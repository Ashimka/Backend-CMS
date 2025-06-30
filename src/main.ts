import { AppModule } from './app.module'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import * as cookieParser from 'cookie-parser'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)
	const configService = app.get(ConfigService)
	const PORT = configService.get<number>('PORT', 8050)

	app.use(cookieParser())
	app.enableCors({
		origin: [
			configService.get<string>('CLIENT_URL'),
			configService.get<string>('CLIENT_URL_VK'),
		],
		credentials: true,
		exposedHeaders: 'set-cookie',
	})

	await app.listen(PORT)
}
bootstrap()
