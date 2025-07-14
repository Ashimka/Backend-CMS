import { Module } from '@nestjs/common'
import { UserService } from './user.service'
import { UserController } from './user.controller'
import { PrismaService } from 'src/prisma.service'
import { RedisCacheModule } from 'src/redis-cache/redis-cache.module'

@Module({
	imports: [RedisCacheModule],
	controllers: [UserController],
	providers: [UserService, PrismaService],
})
export class UserModule {}
