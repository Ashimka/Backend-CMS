import { Injectable, NotFoundException } from '@nestjs/common'
import { Role } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'
import { UserService } from 'src/user/user.service'
import { UpdateRoleDto } from './dto/update-role.dto'

@Injectable()
export class DashboardService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly userService: UserService,
	) {}

	async getOneUser(userId: string) {
		const user = await this.userService.getById(userId)
		if (!user) {
			throw new NotFoundException('Пользователь не найден')
		}
		return user
	}

	async updateRoleUser(userId: string, roleDto: UpdateRoleDto) {
		const user = await this.userService.getById(userId)
		if (!user) {
			throw new NotFoundException('Пользователь не найден')
		}
		if (roleDto.role === 'ADMIN') {
			return await this.prisma.user.update({
				where: { id: user.id },
				data: {
					role: Role.ADMIN,
				},
			})
		}
		if (roleDto.role === 'EMPLOYEES') {
			return await this.prisma.user.update({
				where: { id: user.id },
				data: {
					role: Role.EMPLOYEES,
				},
			})
		}
		if (roleDto.role === 'USER') {
			return await this.prisma.user.update({
				where: { id: user.id },
				data: {
					role: Role.USER,
				},
			})
		}
	}
}
