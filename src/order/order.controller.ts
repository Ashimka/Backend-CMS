import {
	Body,
	Controller,
	Get,
	HttpCode,
	Param,
	Post,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common'
import { OrderService } from './order.service'
import { Auth } from 'src/auth/decorators/auth.decorator'
import { OrderDto } from './dto/order.dto'
import { CurrentUser } from 'src/user/decorators/user.decorator'

@Controller('orders')
export class OrderController {
	constructor(private readonly orderService: OrderService) {}

	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@Post()
	@Auth()
	async checkout(@Body() dto: OrderDto, @CurrentUser('id') userId: string) {
		return this.orderService.createOrder(dto, userId)
	}

	@Get('/:orderId')
	@Auth()
	async getOrdersDetails(@Param('orderId') orderId: string) {
		return this.orderService.getOrdersDetails(orderId)
	}
}
