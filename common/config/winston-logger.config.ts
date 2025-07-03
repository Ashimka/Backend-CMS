import { utilities as nestWinstonModuleUtilities } from 'nest-winston'
import { WinstonModuleOptions } from 'nest-winston'
import * as winston from 'winston'

const isDev = process.env.NODE_ENV === 'development'

export const winstonConfig: WinstonModuleOptions = {
	transports: [
		...(isDev
			? [
					new winston.transports.Console({
						format: winston.format.combine(
							winston.format.timestamp(),
							nestWinstonModuleUtilities.format.nestLike(
								'OnlineShop',
								{
									prettyPrint: true,
								},
							),
						),
					}),
				]
			: []),
		new winston.transports.File({
			filename: 'logs/app.log',
			level: 'info',
			format: winston.format.combine(
				winston.format.timestamp(),
				winston.format.json(),
			),
		}),
	],
}
