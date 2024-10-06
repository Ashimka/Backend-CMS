import { Body, Controller, Patch, UseGuards } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { UpdateRoleDto } from './dto/update-role.dto'
import { RolesGuard } from 'src/auth/guards/role.guard'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { Role } from '@prisma/client'

@Controller('dashboard')
export class DashboardController {
	constructor(private readonly dashboardService: DashboardService) {}

	@UseGuards(RolesGuard)
	@Roles(Role.ADMIN)
	@Patch('settings')
	async updateRoleUser(@Body() roleDto: UpdateRoleDto) {
		return await this.dashboardService.updateRoleUser(roleDto)
	}
}
