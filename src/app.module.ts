import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import * as Joi from 'joi'
import { Module } from '@nestjs/common'

import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { CategoryModule } from './category/category.module'
import { FileModule } from './file/file.module'
import { OrderModule } from './order/order.module'
import { StatisticsModule } from './statistics/statistics.module'
import { ProductModule } from './product/product.module'
import { ReviewModule } from './review/review.module'
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'
import { DashboardModule } from './dashboard/dashboard.module'
import { RedisCacheModule } from './redis-cache/redis-cache.module'

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
			validationSchema: Joi.object({
				NODE_ENV: Joi.string()
					.valid('development', 'production', 'test')
					.default('development'),

				DATABASE_URL: Joi.string().required(),

				PORT: Joi.number().default(8050),

				REDIS_PORT: Joi.number().default(6379),
				REDIS_HOST: Joi.string().default('localhost'),

				JWT_SECRET: Joi.string().required(),
				REFRESH_TOKEN_NAME: Joi.string().required(),

				CLIENT_URL: Joi.string().required(),
				CLIENT_URL_VK: Joi.string().required(),

				SERVER_URL: Joi.string().required(),
				SERVER_DOMAIN: Joi.string().required(),

				YANDEX_CLIENT_ID: Joi.string().required(),
				YANDEX_CLIENT_SECRET: Joi.string().required(),

				VK_CLIENT_ID: Joi.number().required(),
				VK_CLIENT_SECRET: Joi.string().required(),
				VK_CLIENT_SERVICE: Joi.string().required(),

				AT_EXP: Joi.string().required(),
				RT_EXP: Joi.string().required(),
			}),
			validationOptions: {
				allowUnknown: true,
				abortEarly: true,
			},
		}),
		AuthModule,
		UserModule,
		CategoryModule,
		FileModule,
		OrderModule,
		StatisticsModule,
		ProductModule,
		ReviewModule,
		DashboardModule,
		RedisCacheModule,
	],
	providers: [
		{
			provide: APP_GUARD,
			useClass: JwtAuthGuard,
		},
	],
})
export class AppModule {}
