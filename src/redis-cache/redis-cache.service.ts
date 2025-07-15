import { Inject, Injectable, Logger } from '@nestjs/common'

import IORedis from 'ioredis'

@Injectable()
export class RedisCacheService {
	private readonly logger = new Logger(RedisCacheService.name)

	constructor(
		@Inject('REDIS_CLIENT')
		private readonly redisClient: IORedis,
	) {}

	async get(key: string): Promise<string | null> {
		try {
			return await this.redisClient.get(key)
		} catch (err) {
			this.logger.warn(
				`Redis GET failed (${err.message}) - falling back to DB`,
			)
			return null
		}
	}

	async set(key: string, value: any, ttl?: number): Promise<void> {
		try {
			if (ttl) {
				await this.redisClient.set(
					key,
					JSON.stringify(value),
					'EX',
					ttl,
				)
			} else {
				await this.redisClient.set(key, JSON.stringify(value))
			}
		} catch (err) {
			this.logger.warn(
				`Redis SET failed (${err.message}) - skipping cache`,
			)
		}
	}

	async del(key: string): Promise<void> {
		try {
			await this.redisClient.del(key)
		} catch (err) {
			this.logger.warn(
				`Redis DEL failed (${err.message}) - skipping cache invalidation`,
			)
		}
	}

	async delByPattern(pattern: string): Promise<void> {
		const keys = await this.redisClient.keys(pattern)
		if (keys.length > 0) {
			await this.redisClient.del(...keys)
		}
	}

	async isAvailable(): Promise<boolean> {
		try {
			await this.redisClient.ping()
			return true
		} catch {
			return false
		}
	}
}
