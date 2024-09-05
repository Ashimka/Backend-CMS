import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import * as cookieParser from 'cookie-parser'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)

	app.use(cookieParser())
	app.enableCors({
		origin: [process.env.CLIENT_URL, process.env.CLIENT_URL_VK],
		credentials: true,
		exposedHeaders: 'set-cookie',
	})

	await app.listen(8050)
}
bootstrap()
