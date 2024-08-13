import {
	Body,
	Controller,
	HttpCode,
	Post,
	Req,
	Res,
	UnauthorizedException,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthDto } from './dto/auth.dto'
import { Request, Response } from 'express'
import { ConfigService } from '@nestjs/config'

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private configService: ConfigService,
	) {}

	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@Post('login')
	async login(
		@Body() dto: AuthDto,
		@Res({ passthrough: true }) res: Response,
	) {
		const { refreshToken, ...response } = await this.authService.login(dto)

		this.authService.addRefreshTokenToResponse(res, refreshToken)

		return response
	}

	@UsePipes(new ValidationPipe())
	@HttpCode(201)
	@Post('register')
	async register(
		@Body() dto: AuthDto,
		@Res({ passthrough: true }) res: Response,
	) {
		const { refreshToken, ...response } =
			await this.authService.register(dto)

		this.authService.addRefreshTokenToResponse(res, refreshToken)

		return response
	}

	@UsePipes(new ValidationPipe())
	@HttpCode(201)
	@Post('refresh')
	async getNewTokens(
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
	) {
		const refreshTokenFromCookies =
			req.cookies[this.configService.get('REFRESH_TOKEN_NAME')]

		if (!refreshTokenFromCookies) {
			this.authService.removeRefreshTokenFromResponse(res)
			throw new UnauthorizedException('Не авторизован, token invalid!')
		}

		const { refreshToken, ...response } =
			await this.authService.getNewTokens(refreshTokenFromCookies)

		this.authService.addRefreshTokenToResponse(res, refreshToken)

		return response
	}

	@HttpCode(200)
	@Post('logout')
	async logout(@Res({ passthrough: true }) res: Response) {
		this.authService.removeRefreshTokenFromResponse(res)

		return true
	}
}
