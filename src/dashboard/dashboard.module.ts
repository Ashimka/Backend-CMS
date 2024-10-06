import { Module } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { DashboardController } from './dashboard.controller'
import { PrismaService } from 'src/prisma.service'
import { UserService } from 'src/user/user.service'

@Module({
	controllers: [DashboardController],
	providers: [DashboardService, PrismaService, UserService],
})
export class DashboardModule {}
