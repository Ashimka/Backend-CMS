import { Controller, Get } from '@nestjs/common'
import { StatisticsService } from './statistics.service'
import { Auth } from 'src/auth/decorators/auth.decorator'

@Controller('statistics')
export class StatisticsController {
	constructor(private readonly statisticsService: StatisticsService) {}

	@Auth()
	@Get('main')
	async getMainStatistics() {
		return this.statisticsService.getMainStatistics()
	}

	@Auth()
	@Get('middle')
	async getMiddleStatistics() {
		return this.statisticsService.getMiddleStatistics()
	}
}
