import { Inject, Injectable } from '@nestjs/common'

import IORedis from 'ioredis'

@Injectable()
export class RedisCacheService {
	constructor(
		@Inject('REDIS_CLIENT')
		private readonly redisClient: IORedis,
	) {}

	async get(key: string): Promise<string | null> {
		return this.redisClient.get(key)
	}

	async set(key: string, value: any, ttl?: number): Promise<void> {
		if (ttl) {
			await this.redisClient.set(key, JSON.stringify(value), 'EX', ttl)
		} else {
			await this.redisClient.set(key, JSON.stringify(value))
		}
	}

	async del(key: string): Promise<void> {
		await this.redisClient.del(key)
	}

	async keys(pattern: string): Promise<string[]> {
		return this.redisClient.keys(pattern)
	}
}
