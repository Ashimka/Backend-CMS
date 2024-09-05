import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { UserService } from './user.service'
import { Auth } from 'src/auth/decorators/auth.decorator'
import { CurrentUser } from './decorators/user.decorator'
import { ProfileDto } from './dto/profile.dto'

@Controller('users')
export class UserController {
	constructor(private readonly userService: UserService) {}

	@Auth()
	@Get('profile')
	async getProfile(@CurrentUser('id') id: string) {
		return await this.userService.getById(id)
	}

	@Post('profile')
	async createProfile(
		@CurrentUser('id') id: string,
		@Body() dto: ProfileDto,
	) {
		return await this.userService.profileCreate(dto, id)
	}

	@Auth()
	@Patch('profile/favorites/:productId')
	async toggleFavorite(
		@CurrentUser('id') userId: string,
		@Param('productId') productId: string,
	) {
		return this.userService.toggleFavorite(productId, userId)
	}
}
