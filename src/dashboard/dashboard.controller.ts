import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { UpdateRoleDto } from './dto/update-role.dto'
import { RolesGuard } from 'src/auth/guards/role.guard'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { Role } from '@prisma/client'

@Controller('dashboard')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class DashboardController {
	constructor(private readonly dashboardService: DashboardService) {}

	@Get('settings/users')
	async getAllUsers() {
		return await this.dashboardService.getAllUsers()
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
