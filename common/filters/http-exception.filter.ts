import {
	ExceptionFilter,
	Catch,
	ArgumentsHost,
	HttpException,
	HttpStatus,
	Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(HttpExceptionFilter.name)

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse<Response>()
		const request = ctx.getRequest<Request>()

		let status = HttpStatus.INTERNAL_SERVER_ERROR
		let message = 'Internal server error'
		let errorResponse: any = {}

		if (exception instanceof HttpException) {
			status = exception.getStatus()
			const res = exception.getResponse()
			if (typeof res === 'string') {
				message = res
			} else if (typeof res === 'object' && res !== null) {
				message = (res as any).message || message
				errorResponse = res
			}
		} else if (exception instanceof Error) {
			message = exception.message
		}

		this.logger.error(
			`HTTP ${status} Error: ${message} | ${request.method} ${request.url}`,
			exception instanceof Error ? exception.stack : undefined,
		)

		response.status(status).json({
			statusCode: status,
			timestamp: new Date().toISOString(),
			path: request.url,
			message,
			...errorResponse,
		})
	}
}
