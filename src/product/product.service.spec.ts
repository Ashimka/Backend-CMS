import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { PrismaService } from '../prisma.service';
import { RedisCacheService } from '../redis-cache/redis-cache.service';
import { ProductDto } from './dto/product.dto';

describe('ProductService', () => {
	let service: ProductService;
	let prisma: PrismaService;
	let redis: RedisCacheService;

	const mockProductDto: ProductDto = {
		title: 'Новый товар',
		description: 'Описание товара',
		price: 1000,
		images: ['image1.jpg', 'image2.jpg'],
		categoryId: 'cat1',
	};

	const mockCreatedProduct = {
		id: 'product-id',
		...mockProductDto,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	const mockUpdatedProduct = {
		...mockCreatedProduct,
		...mockProductDto,
		updatedAt: new Date(),
	};

	const mockProducts = [
		{
			id: '1',
			title: 'Товар',
			description: 'Описание товара',
			price: 100,
			images: ['image.jpg'],
			category: { title: 'Категория', id: 'cat1' },
		},
		{
			id: '2',
			title: 'Товар2',
			description: 'Описание товара',
			price: 100,
			images: ['image.jpg', 'image2.jpg'],
			category: { title: 'Категория', id: 'cat2' },
		},
		{
			id: '3',
			title: 'Товар3',
			description: 'Описание товара',
			price: 100,
			images: ['image.jpg'],
			category: { title: 'Категория', id: 'cat1' },
		},
		{
			id: '4',
			title: 'Товар4',
			description: 'Описание товара',
			price: 100,
			images: ['image.jpg', 'image2.jpg'],
			category: { title: 'Категория', id: 'cat2' },
		},
	];
	const mockCount = 4;
	const mockCategoryId = 'cat1';

	const mockProductId = 'test-id-123';
	const mockProduct = {
		id: mockProductId,
		title: 'Тестовый товар',
		price: 1000,
		category: { id: 'cat1', title: 'Категория' },
		reviews: [
			{
				id: 'rev1',
				rating: 5,
				user: { id: 'user1', name: 'Пользователь' },
			},
		],
	};

	beforeEach(async () => {
		jest.clearAllMocks();

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ProductService,
				{
					provide: PrismaService,
					useValue: {
						product: {
							create: jest
								.fn()
								.mockResolvedValue(mockCreatedProduct),
							update: jest
								.fn()
								.mockResolvedValue(mockUpdatedProduct),
							findMany: jest.fn().mockResolvedValue(mockProducts),
							findUnique: jest
								.fn()
								.mockResolvedValue(mockProduct),
							delete: jest.fn().mockResolvedValue(mockProduct),
							count: jest.fn(),
						},
					},
				},
				{
					provide: RedisCacheService,
					useValue: {
						isAvailable: jest.fn().mockResolvedValue(true),
						get: jest.fn().mockResolvedValue(null),
						set: jest.fn().mockResolvedValue('OK'),
						delByPattern: jest.fn().mockResolvedValue(true),
						del: jest.fn().mockResolvedValue(1),
					},
				},
			],
		}).compile();

		service = module.get<ProductService>(ProductService);
		prisma = module.get<PrismaService>(PrismaService);
		redis = module.get<RedisCacheService>(RedisCacheService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('create', () => {
		it('должен создавать новый товар и очищать кэш', async () => {
			const result = await service.create(mockProductDto);

			expect(result).toEqual(mockCreatedProduct);
			expect(prisma.product.create).toHaveBeenCalledWith({
				data: {
					title: mockProductDto.title,
					description: mockProductDto.description,
					price: mockProductDto.price,
					images: mockProductDto.images,
					categoryId: mockProductDto.categoryId,
				},
			});
			expect(redis.delByPattern).toHaveBeenCalledWith('products:*');
			expect(redis.del).toHaveBeenCalledWith('products:all');
		});

		it('должен обрабатывать ошибку при создании', async () => {
			(prisma.product.create as jest.Mock).mockRejectedValue(
				new Error('DB error'),
			);

			await expect(service.create(mockProductDto)).rejects.toThrow(
				'DB error',
			);
		});
	});

	describe('update', () => {
		it('должен обновлять товар и очищать кэш', async () => {
			const result = await service.update(mockProductId, mockProductDto);
			expect(result).toEqual(mockUpdatedProduct);

			expect(prisma.product.update).toHaveBeenCalledWith({
				where: { id: mockProductId },
				data: mockProductDto,
			});

			expect(redis.del).toHaveBeenCalledWith(
				`product_one_${mockProductId}`,
			);
			expect(redis.delByPattern).toHaveBeenCalledWith('products:*');
		});

		it('должен бросать ошибку если товар не найден', async () => {
			(redis.get as jest.Mock).mockResolvedValueOnce(null);
			(prisma.product.findUnique as jest.Mock).mockResolvedValueOnce(
				null,
			);

			await expect(
				service.update(mockProductId, mockProductDto),
			).rejects.toThrow('Товар не найден');

			expect(prisma.product.update).not.toHaveBeenCalled();
			expect(redis.del).not.toHaveBeenCalled();
		});
	});

	describe('getAll', () => {
		it('должен возвращать список товаров и общее количество', async () => {
			prisma.product.findMany = jest.fn().mockResolvedValue(mockProducts);
			prisma.product.count = jest.fn().mockResolvedValue(mockCount);

			const result = await service.getAll({ take: 10, skip: 0, page: 1 });
			expect(result.items).toEqual(mockProducts);
			expect(result.total).toBe(mockCount);
		});

		it('должен возвращать пустой массив, если товаров нет', async () => {
			prisma.product.findMany = jest.fn().mockResolvedValue([]);
			prisma.product.count = jest.fn().mockResolvedValue(0);

			const result = await service.getAll({ take: 10, skip: 0, page: 1 });
			expect(result.items).toEqual([]);
			expect(result.total).toBe(0);
		});

		it('должен корректно обрабатывать пагинацию', async () => {
			prisma.product.findMany = jest
				.fn()
				.mockImplementation(({ take, skip }) =>
					Promise.resolve(mockProducts.slice(skip, skip + take)),
				);
			prisma.product.count = jest
				.fn()
				.mockResolvedValue(mockProducts.length);

			const result = await service.getAll({ take: 2, skip: 1, page: 2 });
			expect(result.items.length).toBe(2);
			expect(result.total).toBe(mockProducts.length);
		});
	});

	describe('getById', () => {
		it('должен возвращать товар из БД, если его нет в кэше', async () => {
			(redis.get as jest.Mock).mockResolvedValueOnce(null);
			(prisma.product.findUnique as jest.Mock).mockResolvedValueOnce(
				mockProduct,
			);

			const result = await service.getById(mockProductId);

			expect(result).toEqual(mockProduct);
			expect(prisma.product.findUnique).toHaveBeenCalledWith({
				where: { id: mockProductId },
				include: {
					category: true,
					reviews: { include: { user: true } },
				},
			});
			expect(redis.set).toHaveBeenCalledWith(
				`product_one_${mockProductId}`,
				mockProduct,
				600,
			);
		});

		it('должен возвращать товар из кэша, если он там есть', async () => {
			(redis.get as jest.Mock).mockResolvedValue(
				JSON.stringify(mockProduct),
			);

			const result = await service.getById(mockProductId);

			expect(result).toEqual(mockProduct);
			expect(redis.get).toHaveBeenCalledWith(
				`product_one_${mockProductId}`,
			);
			expect(prisma.product.findUnique).not.toHaveBeenCalled();
		});

		it('должен бросать NotFoundException, если товара нет в БД', async () => {
			(redis.get as jest.Mock).mockResolvedValueOnce(null);
			(prisma.product.findUnique as jest.Mock).mockResolvedValueOnce(
				null,
			);

			await expect(service.getById('non-existent-id')).rejects.toThrow(
				'Товар не найден',
			);
			expect(redis.set).not.toHaveBeenCalled();
		});

		it('должен корректно обрабатывать ошибки при работе с Redis', async () => {
			(redis.get as jest.Mock).mockRejectedValue(
				new Error('Redis error'),
			);

			await expect(service.getById(mockProductId)).rejects.toThrow(
				'Redis error',
			);
		});
	});

	describe('delete', () => {
		it('должен удалить товар и очищать кэш', async () => {
			const result = await service.delete(mockProductId);
			expect(result).toEqual('product deleted');

			expect(prisma.product.delete).toHaveBeenCalledWith({
				where: { id: mockProductId },
			});

			expect(redis.del).toHaveBeenCalledWith(
				`product_one_${mockProductId}`,
			);
			expect(redis.delByPattern).toHaveBeenCalledWith('products:*');
		});

		it('должен бросать ошибку если товар не найден', async () => {
			(redis.get as jest.Mock).mockResolvedValueOnce(null);
			(prisma.product.findUnique as jest.Mock).mockResolvedValueOnce(
				null,
			);

			await expect(service.delete(mockProductId)).rejects.toThrow(
				'Товар не найден',
			);

			expect(prisma.product.delete).not.toHaveBeenCalled();
			expect(redis.del).not.toHaveBeenCalled();
		});
	});

	describe('getByCategory', () => {
		it('должен возвращать список товаров для указанной категории', async () => {
			const result = await service.getByCategory(mockCategoryId);

			expect(prisma.product.findMany).toHaveBeenCalledWith({
				where: {
					categoryId: mockCategoryId,
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

			expect(result).toEqual(mockProducts);
			expect(result.length).toBe(4);
		});

		it('должен бросать NotFoundException, если товары не найдены', async () => {
			(prisma.product.findMany as jest.Mock).mockResolvedValueOnce([]);

			await expect(service.getByCategory(mockCategoryId)).rejects.toThrow(
				'Товары не найдены',
			);
		});
	});
});
