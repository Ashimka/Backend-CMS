import { Injectable } from '@nestjs/common'
import { hash } from 'argon2'
import { AuthDto } from 'src/auth/dto/auth.dto'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class UserService {
	constructor(private readonly prisma: PrismaService) {}
	async getById(id: string) {
		const user = await this.prisma.user.findUnique({
			where: { id },
			select: {
				id: true,
				email: true,
				name: true,
				avatar: true,
				role: true,
				reviews: true,
				favorites: {
					select: {
						products: {
							select: {
								id: true,
								title: true,
								description: true,
								images: true,
								price: true,
								category: {
									select: {
										id: true,
										title: true,
										description: true,
									},
								},
							},
						},
					},
				},
				orders: true,
			},
		})

		return user
	}
	async getByEmail(email: string) {
		const user = await this.prisma.user.findUnique({
			where: { email },
			include: {
				favorites: true,
				orders: true,
			},
		})

		return user
	}

	async toggleFavorite(productId: string, userId: string) {
		const isExists = await this.prisma.favorites.findFirst({
			where: {
				userId,
				productId,
			},
		})

		if (isExists) {
			await this.prisma.favorites.delete({
				where: {
					id: isExists.id,
				},
			})
		} else {
			await this.prisma.favorites.create({
				data: {
					userId,
					productId,
				},
			})
		}

		return true
	}

	async create(dto: AuthDto) {
		return this.prisma.user.create({
			data: {
				email: dto.email,
				name: dto.name,
				password: await hash(dto.password),
			},
		})
	}
}
