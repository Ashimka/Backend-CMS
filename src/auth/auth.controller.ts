import {
	Body,
	Controller,
	Get,
	HttpCode,
	Post,
	Req,
	Res,
	UnauthorizedException,
	UseGuards,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthDto } from './dto/auth.dto'
import { Request, Response } from 'express'
import { ConfigService } from '@nestjs/config'
import { AuthGuard } from '@nestjs/passport'
import { Public } from './decorators/public.decorator'

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private configService: ConfigService,
	) {}

	@Public()
	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@Post('login')
	async login(
		@Body() dto: AuthDto,
		@Res({ passthrough: true }) res: Response,
	) {
		const { refreshToken, ...response } = await this.authService.login(dto)

		this.addRefreshTokenToResponse(res, refreshToken)

		return response
	}

	@Public()
	@UsePipes(new ValidationPipe())
	@HttpCode(201)
	@Post('register')
	async register(
		@Body() dto: AuthDto,
		@Res({ passthrough: true }) res: Response,
	) {
		const { refreshToken, ...response } =
			await this.authService.register(dto)

		this.addRefreshTokenToResponse(res, refreshToken)

		return response
	}

	@Public()
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
			this.removeRefreshTokenFromResponse(res)
			throw new UnauthorizedException('Не авторизован, token invalid!')
		}

		const { refreshToken, ...response } =
			await this.authService.getNewTokens(refreshTokenFromCookies)

		this.addRefreshTokenToResponse(res, refreshToken)

		return response
	}

	@Public()
	@HttpCode(200)
	@Post('logout')
	async logout(@Res({ passthrough: true }) res: Response) {
		this.removeRefreshTokenFromResponse(res)
		return true
	}

	@Public()
	@Get('yandex')
	@UseGuards(AuthGuard('yandex'))
	async yandexAuth(@Req() _req) {}

	@Public()
	@Get('yandex/callback')
	@UseGuards(AuthGuard('yandex'))
	async yandexAuthCallback(
		@Req() req: any,
		@Res({ passthrough: true }) res: Response,
	) {
		const { refreshToken, ...response } =
			await this.authService.validateOAuthLogin(req)

		this.addRefreshTokenToResponse(res, refreshToken)

		return res.redirect(
			`${process.env['CLIENT_URL']}/profile?accessToken=${response.accessToken}`,
		)
	}

	@Public()
	@Get('vk')
	@UseGuards(AuthGuard('vk'))
	async vkAuth(@Req() _req) {}

	@Public()
	@Get('vk/callback')
	@UseGuards(AuthGuard('vk'))
	async vkAuthCallback(@Req() req: any, @Res() res: Response) {
		const { refreshToken, ...response } =
			await this.authService.validateOAuthLogin(req)

		this.addRefreshTokenToResponse(res, refreshToken)

		return res.redirect(
			`${process.env['CLIENT_URL']}/profile?accessTokenVK=${response.accessToken}`,
		)
	}
	private addRefreshTokenToResponse(res: Response, refreshToken: string) {
		const expiresIn = new Date()
		expiresIn.setDate(expiresIn.getDate() + 7)

		res.cookie('RefreshToken', refreshToken, {
			httpOnly: true,
			expires: expiresIn,
			sameSite: 'none',
			secure: true,
			domain: this.configService.get<string>('SERVER_DOMAIN'),
		})
	}

	private removeRefreshTokenFromResponse(res: Response) {
		res.cookie('RefreshToken', '', {
			expires: new Date(),
			httpOnly: true,
			secure: true,
		})
	}
}
