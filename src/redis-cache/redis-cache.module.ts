import { Global, Module } from '@nestjs/common'
import IORedis from 'ioredis'
import { RedisCacheService } from './redis-cache.service'

@Global()
@Module({
	providers: [
		{
			provide: 'REDIS_CLIENT',
			useFactory: () => {
				const redis = new IORedis({
					host: process.env.REDIS_HOST || 'localhost',
					port: parseInt(process.env.REDIS_PORT) || 6379,
					password: process.env.REDIS_PASSWORD,
					db: parseInt(process.env.REDIS_DB) || 0,

					retryStrategy: times => {
						if (times >= 3) {
							console.warn(
								'Redis: Max reconnection attempts reached',
							)
							return null
						}
						return Math.min(times * 100, 2000)
					},
					maxRetriesPerRequest: null,
					enableOfflineQueue: false,
				})
				redis.on('error', err => {
					console.error('Redis error:', err.message)
				})

				return redis
			},
		},
		RedisCacheService,
	],
	exports: ['REDIS_CLIENT', RedisCacheService],
})
export class RedisCacheModule {}
