import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { UserModule } from 'src/user/user.module'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { getJwtConfig } from 'src/config/jwt.config'
import { PrismaService } from 'src/prisma.service'
import { UserService } from 'src/user/user.service'
import { JwtStrategy } from './strategy/jwt.strategy'
import { YandexStrategy } from './strategy/yandex.strategy'
import { RolesGuard } from './guards/role.guard'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { VkStrategy } from './strategy/vk.strategy'
import { PassportModule } from '@nestjs/passport'

@Module({
	imports: [
		UserModule,
		ConfigModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: getJwtConfig,
		}),
		PassportModule,
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
