import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { hash } from 'argon2'
import { AuthDto } from 'src/auth/dto/auth.dto'
import { PrismaService } from 'src/prisma.service'
import { ProfileDto } from './dto/profile.dto'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { UserProfile } from './user.type'

@Injectable()
export class UserService {
	constructor(
		private readonly prisma: PrismaService,
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
	) {}

	async getById(id: string) {
		const cacheKey = `user_${id}`

		let user: UserProfile = await this.cacheManager.get(cacheKey)

		if (user) {
			return user
		}
		user = await this.prisma.user.findUnique({
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
				profile: {
					select: {
						id: true,
						address: true,
						firstName: true,
						lastName: true,
						phone: true,
					},
				},
				orders: true,
			},
		})

		if (user) {
			await this.cacheManager.set(cacheKey, user)
		}

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
	async getByVkId(vkId: number) {
		const user = await this.prisma.user.findFirst({
			where: { vkId },
			include: {
				favorites: true,
				orders: true,
			},
		})

		return user
	}

	async getAllUsers({
		take,
		skip,
		page,
	}: {
		take: number
		skip: number
		page: number
	}) {
		const [items, total] = await Promise.all([
			await this.prisma.user.findMany({
				select: {
					id: true,
					email: true,
					role: true,
					name: true,
					avatar: true,
					createdAt: true,
				},
				take,
				skip,
				orderBy: {
					createdAt: 'desc',
				},
			}),
			this.prisma.user.count(),
		])
		return {
			total,
			page: +page,
			limit: take,
			items,
		}
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
				avatar: '/uploads/noavatar.png',
				password: await hash(dto.password),
			},
		})
	}

	async profileCreate(id: string, dto: ProfileDto) {
		return await this.prisma.profile.create({
			data: {
				address: dto.address,
				firstName: dto.firstName,
				lastName: dto.lastName,
				phone: dto.phone,
				userId: id,
			},
		})
	}
	async profileUpdate(id: string, dto: ProfileDto) {
		const user = await this.getById(id)

		if (user.profile === null) {
			throw new NotFoundException('Профиль пользователя не найден')
		}

		await this.cacheManager.del(`user_${id}`)

		return this.prisma.profile.update({
			where: {
				id: user.profile.id,
			},
			data: dto,
		})
	}
}
