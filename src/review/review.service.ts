import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { ProductService } from 'src/product/product.service'
import { ReviewDto } from './dto/review.dto'

@Injectable()
export class ReviewService {
	constructor(
		private prisma: PrismaService,
		private productService: ProductService,
	) {}

	async getById(id: string, userId: string) {
		const review = await this.prisma.review.findUnique({
			where: {
				id,
				userId,
			},
			include: {
				user: true,
			},
		})

		if (!review)
			throw new NotFoundException(
				'Отзыв не найден или вы не являетесь его владельцем',
			)

		return review
	}

	async create(userId: string, productId: string, dto: ReviewDto) {
		await this.productService.getById(productId)

		return this.prisma.review.create({
			data: {
				...dto,
				product: {
					connect: {
						id: productId,
					},
				},
				user: {
					connect: {
						id: userId,
					},
				},
			},
		})
	}

	async delete(id: string, userId: string) {
		await this.getById(id, userId)

		return this.prisma.review.delete({
			where: {
				id,
			},
		})
	}
}
