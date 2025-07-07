import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Query,
	UseGuards,
} from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { UpdateRoleDto } from './dto/update-role.dto'
import { RolesGuard } from 'src/auth/guards/role.guard'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { Role } from '@prisma/client'
import { UserService } from 'src/user/user.service'

@Controller('dashboard')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class DashboardController {
	constructor(
		private readonly dashboardService: DashboardService,
		private readonly userService: UserService,
	) {}

	@Get('settings/users')
	async getAllUsers(
		@Query('page') page: number = 1,
		@Query('limit') limit: number = 24,
	) {
		const take = Math.min(limit, 24)
		const skip = (page - 1) * take
		return await this.userService.getAllUsers({
			take,
			skip,
			page,
		})
	}

	@Get('settings/users/:userId')
	async getOneUser(@Param('userId') userId: string) {
		return this.dashboardService.getOneUser(userId)
	}

	@Patch('settings/users/:userId')
	async updateRoleUser(
		@Body() roleDto: UpdateRoleDto,
		@Param('userId') userId: string,
	) {
		return await this.dashboardService.updateRoleUser(userId, roleDto)
	}
}
