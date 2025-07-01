import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { ProductService } from 'src/product/product.service'
import { ReviewDto } from './dto/review.dto'

@Injectable()
export class ReviewService {
	constructor(
		private readonly logger = new Logger(ReviewService.name),
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

	async getAll() {
		const review = await this.prisma.review.findMany({
			include: {
				user: true,
			},
		})
		return review
	}

	async create(userId: string, productId: string, dto: ReviewDto) {
		try {
			await this.productService.getById(productId)

			const newReview = await this.prisma.review.create({
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
			this.logger.log(
				`Пользователь ${userId} оставил отзыв к продукту ${productId}`,
			)

			return newReview
		} catch (error) {
			this.logger.error(
				`Ошибка при создании отзыва на: ${productId} пользователем ${userId}: ${error.message}`,
				error.stack,
			)
			throw new BadRequestException('Не удалось создать отзыв')
		}
	}

	async delete(id: string, userId: string) {
		try {
			await this.getById(id, userId)

			await this.prisma.review.delete({
				where: {
					id,
				},
			})
			this.logger.log(`Отзыв ${id} удален пользователем ${userId}`)
		} catch (error) {
			this.logger.error(
				`Ошибка при удалении отзыва ${id} пользователем ${userId}: ${error.message}`,
			)
		}
	}
}
