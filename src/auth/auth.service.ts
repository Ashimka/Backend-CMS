import {
	BadRequestException,
	Injectable,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from 'src/prisma.service'
import { UserService } from 'src/user/user.service'
import { AuthDto } from './dto/auth.dto'
import { ConfigService } from '@nestjs/config'
import { verify } from 'argon2'

@Injectable()
export class AuthService {
	constructor(
		private jwt: JwtService,
		private configService: ConfigService,
		private userService: UserService,
		private prisma: PrismaService,
	) {}

	async register(dto: AuthDto) {
		const foundUser = await this.userService.getByEmail(dto.email)

		if (foundUser) {
			throw new BadRequestException('Пользователь уже зарегистрирован!')
		}

		const user = await this.userService.create(dto)
		const tokens = this.issueTokens(user.id, user.role)

		return { user, ...tokens }
	}

	async login(dto: AuthDto) {
		const user = await this.validateUser(dto)

		const verifyPass = await this.chechPassword(dto.password, user.password)

		if (!verifyPass) {
			throw new UnauthorizedException('Неверный пароль')
		}

		const tokens = this.issueTokens(user.id, user.role)

		return { user, ...tokens }
	}

	async getNewTokens(refreshToken: string) {
		const result = await this.jwt.verifyAsync(refreshToken)

		if (!result) {
			throw new UnauthorizedException('Не авторизован, token invalid!')
		}

		const user = await this.userService.getById(result.id)
		const tokens = this.issueTokens(user.id, user.role)

		return { user, ...tokens }
	}

	issueTokens(userId: string, role: string) {
		const data = { id: userId, role }

		const accessToken = this.jwt.sign(data, {
			expiresIn: this.configService.get('AT_EXP'),
		})
		const refreshToken = this.jwt.sign(data, {
			expiresIn: this.configService.get('RT_EXP'),
		})

		return { accessToken, refreshToken }
	}

	private async validateUser(dto: AuthDto) {
		const user = await this.userService.getByEmail(dto.email)

		if (!user) {
			throw new NotFoundException('Пользователь не найден!')
		}

		return user
	}

	async validateOAuthLogin(req: any) {
		let user = req.user.vkId
			? await this.userService.getByVkId(req.user.vkId)
			: await this.userService.getByEmail(req.user.email)

		if (!user) {
			user = await this.prisma.user.create({
				data: {
					email: req.user.email,
					name: req.user.name,
					avatar: req.user.avatar,
					vkId: req.user.vkId,
				},
				include: {
					favorites: true,
					orders: true,
				},
			})
		}

		const tokens = this.issueTokens(user.id, user.role)

		return { user, ...tokens }
	}

	private async chechPassword(password: string, hashPassword: string) {
		return await verify(hashPassword, password)
	}
}
