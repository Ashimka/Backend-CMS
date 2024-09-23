import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'

import { UserModule } from 'src/user/user.module'

import { PrismaService } from 'src/prisma.service'
import { AuthService } from './auth.service'
import { UserService } from 'src/user/user.service'

import { AuthController } from './auth.controller'

import { getJwtConfig } from 'src/config/jwt.config'
import { JwtStrategy } from './strategy/jwt.strategy'
import { YandexStrategy } from './strategy/yandex.strategy'
import { VkStrategy } from './strategy/vk.strategy'

import { RolesGuard } from './guards/role.guard'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

@Module({
	imports: [
		UserModule,
		ConfigModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: getJwtConfig,
		}),
	],
	controllers: [AuthController],
	providers: [
		AuthService,
		PrismaService,
		UserService,
		JwtAuthGuard,
		RolesGuard,
		JwtStrategy,
		YandexStrategy,
		VkStrategy,
	],
})
export class AuthModule {}
