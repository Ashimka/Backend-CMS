import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { OrderDto } from './dto/order.dto'

@Injectable()
export class OrderService {
	constructor(private prisma: PrismaService) {}

	async createOrder(dto: OrderDto, userId: string) {
		const orderItems = dto.items.map(item => ({
			quantity: item.quantity,
			price: item.price,
			product: {
				connect: {
					id: item.productId,
				},
			},
		}))

		const total = dto.items.reduce((acc, item) => {
			return acc + item.price * item.quantity
		}, 0)

		const order = await this.prisma.order.create({
			data: {
				status: dto.status,
				items: {
					create: orderItems,
				},
				total,
				user: {
					connect: {
						id: userId,
					},
				},
			},
		})

		return order
	}

	async getOrdersDetails(orderId: string) {
		const orders = await this.prisma.orderItem.findMany({
			where: {
				orderId,
			},
			select: {
				id: true,
				quantity: true,
				price: true,
				product: {
					select: {
						title: true,
					},
				},
			},
		})

		if (orders.length === 0) throw new NotFoundException('Заказ не найден')

		return orders.map(order => ({
			id: order.id,
			quantity: order.quantity,
			price: order.price,
			title: order.product.title,
		}))
	}
}
