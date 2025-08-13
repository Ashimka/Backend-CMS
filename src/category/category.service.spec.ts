import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from './category.service';
import { PrismaService } from '../prisma.service';
import { CategoryDto } from './dto/category.dto';
import { NotFoundException } from '@nestjs/common';

describe('CategoryService', () => {
	let service: CategoryService;
	let prisma: PrismaService;

	const mockCategoryDto: CategoryDto = {
		title: 'Новая категория',
		description: 'Описание категории',
	};

	const mockCategory = {
		id: 'category-id-123',
		title: 'Тестовая категория',
		description: 'Описание тестовой категории',
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	const mockCategories = [
		{
			id: '1',
			title: 'Категория 1',
			createdAt: new Date('2024-01-01'),
		},
		{
			id: '2',
			title: 'Категория 2',
			createdAt: new Date('2024-01-02'),
		},
		{
			id: '3',
			title: 'Категория 3',
			createdAt: new Date('2024-01-03'),
		},
	];

	const mockCategoryId = 'test-category-id';

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				CategoryService,
				{
					provide: PrismaService,
					useValue: {
						category: {
							create: jest.fn().mockResolvedValue(mockCategory),
							update: jest.fn().mockResolvedValue(mockCategory),
							findMany: jest
								.fn()
								.mockResolvedValue(mockCategories),
							findUnique: jest
								.fn()
								.mockResolvedValue(mockCategory),
							delete: jest.fn().mockResolvedValue(mockCategory),
						},
					},
				},
			],
		}).compile();

		service = module.get<CategoryService>(CategoryService);
		prisma = module.get<PrismaService>(PrismaService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('getAll', () => {
		it('должен возвращать список всех категорий с выбранными полями', async () => {
			const result = await service.getAll();

			expect(result).toEqual(mockCategories);
			expect(prisma.category.findMany).toHaveBeenCalledWith({
				select: {
					id: true,
					title: true,
					createdAt: true,
				},
			});
		});

		it('должен возвращать пустой массив, если категорий нет', async () => {
			(prisma.category.findMany as jest.Mock).mockResolvedValueOnce([]);

			const result = await service.getAll();

			expect(result).toEqual([]);
			expect(prisma.category.findMany).toHaveBeenCalledWith({
				select: {
					id: true,
					title: true,
					createdAt: true,
				},
			});
		});

		it('должен обрабатывать ошибку при получении категорий', async () => {
			(prisma.category.findMany as jest.Mock).mockRejectedValue(
				new Error('Database error'),
			);

			await expect(service.getAll()).rejects.toThrow('Database error');
		});
	});

	describe('getById', () => {
		it('должен возвращать категорию по ID', async () => {
			const result = await service.getById(mockCategoryId);

			expect(result).toEqual(mockCategory);
			expect(prisma.category.findUnique).toHaveBeenCalledWith({
				where: {
					id: mockCategoryId,
				},
			});
		});

		it('должен бросать NotFoundException, если категория не найдена', async () => {
			(prisma.category.findUnique as jest.Mock).mockResolvedValueOnce(
				null,
			);

			await expect(service.getById('non-existent-id')).rejects.toThrow(
				NotFoundException,
			);
		});

		it('должен обрабатывать ошибку при получении категории', async () => {
			(prisma.category.findUnique as jest.Mock).mockRejectedValue(
				new Error('Database error'),
			);

			await expect(service.getById(mockCategoryId)).rejects.toThrow(
				'Database error',
			);
		});
	});

	describe('create', () => {
		it('должен создавать новую категорию', async () => {
			const result = await service.create(mockCategoryDto);

			expect(result).toEqual(mockCategory);
			expect(prisma.category.create).toHaveBeenCalledWith({
				data: {
					title: mockCategoryDto.title,
					description: mockCategoryDto.description,
				},
			});
		});

		it('должен обрабатывать ошибку при создании категории', async () => {
			(prisma.category.create as jest.Mock).mockRejectedValue(
				new Error('Database error'),
			);

			await expect(service.create(mockCategoryDto)).rejects.toThrow(
				'Database error',
			);
		});

		it('должен корректно передавать данные в Prisma', async () => {
			const customDto: CategoryDto = {
				title: 'Кастомная категория',
				description: 'Кастомное описание',
			};

			await service.create(customDto);

			expect(prisma.category.create).toHaveBeenCalledWith({
				data: {
					title: customDto.title,
					description: customDto.description,
				},
			});
		});
	});

	describe('update', () => {
		it('должен обновлять существующую категорию', async () => {
			const updateDto: CategoryDto = {
				title: 'Обновленная категория',
				description: 'Обновленное описание',
			};

			const result = await service.update(mockCategoryId, updateDto);

			expect(result).toEqual(mockCategory);
			expect(prisma.category.update).toHaveBeenCalledWith({
				where: { id: mockCategoryId },
				data: updateDto,
			});
		});

		it('должен проверять существование категории перед обновлением', async () => {
			const updateDto: CategoryDto = {
				title: 'Обновленная категория',
				description: 'Обновленное описание',
			};

			await service.update(mockCategoryId, updateDto);

			expect(prisma.category.findUnique).toHaveBeenCalledWith({
				where: { id: mockCategoryId },
			});
		});

		it('должен бросать NotFoundException, если категория не найдена при обновлении', async () => {
			(prisma.category.findUnique as jest.Mock).mockResolvedValueOnce(
				null,
			);

			const updateDto: CategoryDto = {
				title: 'Обновленная категория',
				description: 'Обновленное описание',
			};

			await expect(
				service.update('non-existent-id', updateDto),
			).rejects.toThrow(NotFoundException);

			expect(prisma.category.update).not.toHaveBeenCalled();
		});

		it('должен обрабатывать ошибку при обновлении категории', async () => {
			(prisma.category.update as jest.Mock).mockRejectedValue(
				new Error('Database error'),
			);

			const updateDto: CategoryDto = {
				title: 'Обновленная категория',
				description: 'Обновленное описание',
			};

			await expect(
				service.update(mockCategoryId, updateDto),
			).rejects.toThrow('Database error');
		});
	});

	describe('delete', () => {
		it('должен удалять существующую категорию', async () => {
			const result = await service.delete(mockCategoryId);

			expect(result).toEqual(mockCategory);
			expect(prisma.category.delete).toHaveBeenCalledWith({
				where: { id: mockCategoryId },
			});
		});

		it('должен проверять существование категории перед удалением', async () => {
			await service.delete(mockCategoryId);

			expect(prisma.category.findUnique).toHaveBeenCalledWith({
				where: { id: mockCategoryId },
			});
		});

		it('должен бросать NotFoundException, если категория не найдена при удалении', async () => {
			(prisma.category.findUnique as jest.Mock).mockResolvedValueOnce(
				null,
			);

			await expect(service.delete('non-existent-id')).rejects.toThrow(
				NotFoundException,
			);

			expect(prisma.category.delete).not.toHaveBeenCalled();
		});

		it('должен обрабатывать ошибку при удалении категории', async () => {
			(prisma.category.delete as jest.Mock).mockRejectedValue(
				new Error('Database error'),
			);

			await expect(service.delete(mockCategoryId)).rejects.toThrow(
				'Database error',
			);
		});
	});

	describe('интеграционные тесты', () => {
		it('должен корректно работать с пустыми данными', async () => {
			const emptyDto: CategoryDto = {
				title: '',
				description: '',
			};

			await service.create(emptyDto);

			expect(prisma.category.create).toHaveBeenCalledWith({
				data: {
					title: '',
					description: '',
				},
			});
		});

		it('должен корректно работать с длинными строками', async () => {
			const longDto: CategoryDto = {
				title: 'Очень длинное название категории с множеством символов для тестирования граничных случаев',
				description:
					'Очень длинное описание категории с множеством символов для тестирования граничных случаев и проверки корректной работы с большими текстами',
			};

			await service.create(longDto);

			expect(prisma.category.create).toHaveBeenCalledWith({
				data: {
					title: longDto.title,
					description: longDto.description,
				},
			});
		});

		it('должен корректно работать с специальными символами', async () => {
			const specialDto: CategoryDto = {
				title: 'Категория с символами: !@#$%^&*()_+-=[]{}|;:,.<>?',
				description: 'Описание с символами: !@#$%^&*()_+-=[]{}|;:,.<>?',
			};

			await service.create(specialDto);

			expect(prisma.category.create).toHaveBeenCalledWith({
				data: {
					title: specialDto.title,
					description: specialDto.description,
				},
			});
		});
	});
});
