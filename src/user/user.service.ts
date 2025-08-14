import {
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { hash } from 'argon2';
import { AuthDto } from 'src/auth/dto/auth.dto';
import { PrismaService } from 'src/prisma.service';
import { ProfileDto } from './dto/profile.dto';
import { RedisCacheService } from 'src/redis-cache/redis-cache.service';

@Injectable()
export class UserService {
	private readonly logger = new Logger(UserService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly redisService: RedisCacheService,
	) {}

	async isValidateUser(id: string) {
		const cacheKey = `user_is_valid_${id}`;

		const cachedUserValid = await this.redisService.get(cacheKey);

		if (cachedUserValid) {
			return JSON.parse(cachedUserValid);
		}

		const findUser = await this.prisma.user.findUnique({
			where: { id },
			select: {
				id: true,
				role: true,
			},
		});
		await this.redisService.set(cacheKey, findUser, 3600);

		return findUser;
	}
	async getById(id: string) {
		const cacheKey = `user_${id}`;

		try {
			const cachedUser = await this.redisService.get(cacheKey);

			if (cachedUser) {
				return JSON.parse(cachedUser);
			}

			const user = await this.prisma.user.findUnique({
				where: { id },
				select: {
					id: true,
					email: true,
					name: true,
					avatar: true,
					role: true,
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
				},
			});

			if (!user) {
				throw new NotFoundException('Пользователь не найден');
			}

			await this.redisService.set(cacheKey, user, 3600);

			return user;
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}

			this.logger.error('Пользователь по ID не найден', error);
			throw new InternalServerErrorException(
				'Ошибка при получении пользователя',
			);
		}
	}

	async getByEmail(email: string) {
		const user = await this.prisma.user.findUnique({
			where: { email },
			include: {
				favorites: true,
				orders: true,
			},
		});

		return user;
	}
	async getByVkId(vkId: number) {
		const user = await this.prisma.user.findFirst({
			where: { vkId },
			include: {
				favorites: true,
				orders: true,
			},
		});

		return user;
	}

	async getAllUsers({
		take,
		skip,
		page,
	}: {
		take: number;
		skip: number;
		page: number;
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
		]);
		return {
			total,
			page: +page,
			limit: take,
			items,
		};
	}

	async toggleFavorite(productId: string, userId: string) {
		const isExists = await this.prisma.favorites.findFirst({
			where: {
				userId,
				productId,
			},
		});

		if (isExists) {
			await this.prisma.favorites.delete({
				where: {
					id: isExists.id,
				},
			});
		} else {
			await this.prisma.favorites.create({
				data: {
					userId,
					productId,
				},
			});
		}

		return true;
	}

	async create(dto: AuthDto) {
		const newUser = await this.prisma.user.create({
			data: {
				email: dto.email,
				name: dto.name,
				avatar: '/uploads/noavatar.png',
				password: await hash(dto.password),
			},
		});

		return {
			id: newUser.id,
			vkId: newUser.vkId,
			email: newUser.email,
			name: newUser.name,
			avatar: newUser.avatar,
			role: newUser.role,
		};
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
		});
	}
	async profileUpdate(id: string, dto: ProfileDto) {
		const user = await this.getById(id);

		if (user.profile === null) {
			throw new NotFoundException('Профиль пользователя не найден');
		}

		await this.redisService.del(`user_${id}`);

		return this.prisma.profile.update({
			where: {
				id: user.profile.id,
			},
			data: dto,
		});
	}
}
