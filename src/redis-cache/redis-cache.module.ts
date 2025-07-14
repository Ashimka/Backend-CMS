import { Global, Module } from '@nestjs/common'
import IORedis from 'ioredis'
import { RedisCacheService } from './redis-cache.service'

@Global()
@Module({
	providers: [
		{
			provide: 'REDIS_CLIENT',
			useFactory: () => {
				return new IORedis({
					host: process.env.REDIS_HOST || 'localhost',
					port: parseInt(process.env.REDIS_PORT) || 6379,
					password: process.env.REDIS_PASSWORD,
					db: parseInt(process.env.REDIS_DB) || 0,
				})
			},
		},
		RedisCacheService,
	],
	exports: ['REDIS_CLIENT', RedisCacheService],
})
export class RedisCacheModule {}
