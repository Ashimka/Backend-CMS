import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ProductDto } from './dto/product.dto';
import { RedisCacheService } from 'src/redis-cache/redis-cache.service';

@Injectable()
export class ProductService {
	private readonly logger = new Logger(ProductService.name);
	constructor(
		private prisma: PrismaService,
		private readonly redisService: RedisCacheService,
	) {}

	private getCacheKey(params: {
		take: number;
		skip: number;
		searchTerm?: string;
		page: number;
	}): string {
		return `products:${params.page}:${params.take}:${params.skip}:${params.searchTerm || ''}`;
	}

	async getAll({
		take,
		skip,
		searchTerm,
		page,
	}: {
		take: number;
		skip: number;
		searchTerm?: string;
		page: number;
	}) {
		const cacheKey = this.getCacheKey({ take, skip, searchTerm, page });

		const isCacheAvailable = await this.redisService.isAvailable();
		let cachedData;

		if (isCacheAvailable) {
			cachedData = await this.redisService.get(cacheKey);
			if (cachedData) {
				return JSON.parse(cachedData);
			}
		}

		const [items, total] = await Promise.all([
			this.prisma.product.findMany({
				where: searchTerm
					? {
							title: {
								contains: searchTerm,
								mode: 'insensitive',
							},
						}
					: {},
				take,
				skip,
				orderBy: { createdAt: 'desc' },
				select: {
					id: true,
					title: true,
					description: true,
					price: true,
					images: true,
					category: {
						select: {
							title: true,
							id: true,
						},
					},
				},
			}),
			this.prisma.product.count({
				where: searchTerm
					? {
							title: {
								contains: searchTerm,
								mode: 'insensitive',
							},
						}
					: {},
			}),
		]);

		const result = {
			total,
			page: +page,
			limit: take,
			items,
		};

		if (isCacheAvailable) {
			await this.redisService.set(cacheKey, result, 300);
		}
		return result;
	}

	async getById(id: string) {
		const cacheKey = `product_one_${id}`;

		const cachedProduct = await this.redisService.get(cacheKey);

		if (cachedProduct) {
			return JSON.parse(cachedProduct);
		}
		const product = await this.prisma.product.findUnique({
			where: {
				id,
			},
			include: {
				category: true,
				reviews: {
					include: {
						user: true,
					},
				},
			},
		});

		if (!product) throw new NotFoundException('Товар не найден');

		await this.redisService.set(cacheKey, product, 600);

		return product;
	}

	async getByCategory(categoryId: string) {
		const products = await this.prisma.product.findMany({
			where: {
				categoryId,
			},
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				title: true,
				description: true,
				price: true,
				images: true,
				category: {
					select: {
						title: true,
					},
				},
				createdAt: true,
			},
		});

		if (products.length === 0)
			throw new NotFoundException('Товары не найдены');

		return products;
	}

	async getMostPopular() {
		const mostPopularProducts = await this.prisma.orderItem.groupBy({
			by: ['productId'],
			_count: {
				id: true,
			},
			orderBy: {
				_count: {
					id: 'desc',
				},
			},
		});

		const productIds = mostPopularProducts.map(item => item.productId);

		const products = await this.prisma.product.findMany({
			where: {
				id: {
					in: productIds,
				},
			},
			include: {
				category: true,
			},
		});

		return products;
	}

	async getSimilar(id: string) {
		const currentProduct = await this.getById(id);

		if (!currentProduct)
			throw new NotFoundException('Текущий товар не найден');

		const products = await this.prisma.product.findMany({
			where: {
				category: {
					title: currentProduct.category.title,
				},
				NOT: {
					id: currentProduct.id,
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
			include: {
				category: true,
			},
		});

		return products;
	}

	async create(dto: ProductDto) {
		const newProduct = await this.prisma.product.create({
			data: {
				title: dto.title,
				description: dto.description,
				price: dto.price,
				images: dto.images,
				categoryId: dto.categoryId,
			},
		});
		await this.clearProductsCache(dto);

		return newProduct;
	}

	async update(id: string, dto: ProductDto) {
		const cacheKey = `product_one_${id}`;

		await this.getById(id);

		const updatedProduct = await this.prisma.product.update({
			where: { id },
			data: dto,
		});

		await this.redisService.del(cacheKey);
		await this.clearProductsCache(dto);

		return updatedProduct;
	}

	async delete(id: string) {
		const cacheKey = `product_one_${id}`;
		await this.getById(id);

		const deletedProduct = await this.prisma.product.delete({
			where: { id },
		});
		await this.redisService.del(cacheKey);
		await this.clearProductsCache(deletedProduct);

		return 'product deleted';
	}

	private async clearProductsCache(dto: ProductDto) {
		try {
			await this.redisService.delByPattern('products:*');

			await this.redisService.del('products:all');
			if (dto.categoryId) {
				await this.redisService.del(
					`products:category:${dto.categoryId}`,
				);
			}
		} catch (err) {
			this.logger.error('Failed to clear products cache', err.stack);
		}
	}
}
