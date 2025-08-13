import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma.service';
import { RedisCacheService } from '../redis-cache/redis-cache.service';
import { AuthDto } from '../auth/dto/auth.dto';
import { ProfileDto } from './dto/profile.dto';
import { NotFoundException } from '@nestjs/common';
import { hash } from 'argon2';

// Мокаем argon2
jest.mock('argon2', () => ({
	hash: jest.fn(),
}));

describe('UserService', () => {
	let service: UserService;
	let prisma: PrismaService;
	let redis: RedisCacheService;

	const mockAuthDto: AuthDto = {
		email: 'test@example.com',
		password: 'password123',
		name: 'Test User',
		vkId: 123456,
	};

	const mockProfileDto: ProfileDto = {
		address: 'Test Address',
		firstName: 'John',
		lastName: 'Doe',
		phone: '+1234567890',
	};

	const mockUser = {
		id: 'user-id-123',
		email: 'test@example.com',
		name: 'Test User',
		avatar: '/uploads/noavatar.png',
		role: 'USER',
		vkId: 123456,
		password: 'hashedPassword',
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	const mockUserWithProfile = {
		id: 'user-id-123',
		email: 'test@example.com',
		name: 'Test User',
		avatar: '/uploads/noavatar.png',
		role: 'USER',
		profile: {
			id: 'profile-id-123',
			address: 'Test Address',
			firstName: 'John',
			lastName: 'Doe',
			phone: '+1234567890',
		},
		orders: [],
		reviews: [],
		favorites: {
			products: [],
		},
	};

	const mockUserValid = {
		id: 'user-id-123',
		role: 'USER',
	};

	const mockUsers = [
		{
			id: '1',
			email: 'user1@example.com',
			role: 'USER',
			name: 'User 1',
			avatar: '/uploads/avatar1.jpg',
			createdAt: new Date('2024-01-01'),
		},
		{
			id: '2',
			email: 'user2@example.com',
			role: 'ADMIN',
			name: 'User 2',
			avatar: '/uploads/avatar2.jpg',
			createdAt: new Date('2024-01-02'),
		},
	];

	const mockProfile = {
		id: 'profile-id-123',
		address: 'Test Address',
		firstName: 'John',
		lastName: 'Doe',
		phone: '+1234567890',
		userId: 'user-id-123',
	};

	const mockFavorites = {
		id: 'favorite-id-123',
		userId: 'user-id-123',
		productId: 'product-id-123',
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UserService,
				{
					provide: PrismaService,
					useValue: {
						user: {
							findUnique: jest.fn(),
							findFirst: jest.fn(),
							findMany: jest.fn(),
							create: jest.fn(),
							count: jest.fn(),
						},
						profile: {
							create: jest.fn(),
							update: jest.fn(),
						},
						favorites: {
							findFirst: jest.fn(),
							create: jest.fn(),
							delete: jest.fn(),
						},
					},
				},
				{
					provide: RedisCacheService,
					useValue: {
						get: jest.fn(),
						set: jest.fn(),
						del: jest.fn(),
						isAvailable: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<UserService>(UserService);
		prisma = module.get<PrismaService>(PrismaService);
		redis = module.get<RedisCacheService>(RedisCacheService);

		// Сбрасываем все моки
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('isValidateUser', () => {
		it('должен возвращать пользователя из кэша, если он там есть', async () => {
			(redis.get as jest.Mock).mockResolvedValue(
				JSON.stringify(mockUserValid),
			);

			const result = await service.isValidateUser('user-id-123');

			expect(result).toEqual(mockUserValid);
			expect(redis.get).toHaveBeenCalledWith('user_is_valid_user-id-123');
			expect(prisma.user.findUnique).not.toHaveBeenCalled();
		});

		it('должен возвращать пользователя из БД и кэшировать его, если его нет в кэше', async () => {
			(redis.get as jest.Mock).mockResolvedValue(null);
			(prisma.user.findUnique as jest.Mock).mockResolvedValue(
				mockUserValid,
			);
			(redis.set as jest.Mock).mockResolvedValue('OK');

			const result = await service.isValidateUser('user-id-123');

			expect(result).toEqual(mockUserValid);
			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { id: 'user-id-123' },
				select: {
					id: true,
					role: true,
				},
			});
			expect(redis.set).toHaveBeenCalledWith(
				'user_is_valid_user-id-123',
				mockUserValid,
				3600,
			);
		});
	});

	describe('getById', () => {
		it('должен возвращать пользователя из кэша, если он там есть', async () => {
			(redis.get as jest.Mock).mockResolvedValue(
				JSON.stringify(mockUserWithProfile),
			);

			const result = await service.getById('user-id-123');

			expect(result).toEqual(mockUserWithProfile);
			expect(redis.get).toHaveBeenCalledWith('user_user-id-123');
			expect(prisma.user.findUnique).not.toHaveBeenCalled();
		});

		it('должен возвращать пользователя из БД и кэшировать его, если его нет в кэше', async () => {
			(redis.get as jest.Mock).mockResolvedValue(null);
			(prisma.user.findUnique as jest.Mock).mockResolvedValue(
				mockUserWithProfile,
			);
			(redis.set as jest.Mock).mockResolvedValue('OK');

			const result = await service.getById('user-id-123');

			expect(result).toEqual(mockUserWithProfile);
			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { id: 'user-id-123' },
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
			expect(redis.set).toHaveBeenCalledWith(
				'user_user-id-123',
				mockUserWithProfile,
				3600,
			);
		});
	});

	describe('getByEmail', () => {
		it('должен возвращать пользователя по email', async () => {
			(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

			const result = await service.getByEmail('test@example.com');

			expect(result).toEqual(mockUser);
			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { email: 'test@example.com' },
				include: {
					favorites: true,
					orders: true,
				},
			});
		});

		it('должен возвращать null, если пользователь не найден', async () => {
			(prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

			const result = await service.getByEmail('nonexistent@example.com');

			expect(result).toBeNull();
		});
	});

	describe('getByVkId', () => {
		it('должен возвращать пользователя по VK ID', async () => {
			(prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

			const result = await service.getByVkId(12345);

			expect(result).toEqual(mockUser);
			expect(prisma.user.findFirst).toHaveBeenCalledWith({
				where: { vkId: 12345 },
				include: {
					favorites: true,
					orders: true,
				},
			});
		});

		it('должен возвращать null, если пользователь не найден', async () => {
			(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

			const result = await service.getByVkId(99999);

			expect(result).toBeNull();
		});
	});

	describe('getAllUsers', () => {
		it('должен возвращать список пользователей с пагинацией', async () => {
			(prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
			(prisma.user.count as jest.Mock).mockResolvedValue(2);

			const result = await service.getAllUsers({
				take: 10,
				skip: 0,
				page: 1,
			});

			expect(result).toEqual({
				total: 2,
				page: 1,
				limit: 10,
				items: mockUsers,
			});
			expect(prisma.user.findMany).toHaveBeenCalledWith({
				select: {
					id: true,
					email: true,
					role: true,
					name: true,
					avatar: true,
					createdAt: true,
				},
				take: 10,
				skip: 0,
				orderBy: {
					createdAt: 'desc',
				},
			});
			expect(prisma.user.count).toHaveBeenCalled();
		});

		it('должен корректно обрабатывать пустой результат', async () => {
			(prisma.user.findMany as jest.Mock).mockResolvedValue([]);
			(prisma.user.count as jest.Mock).mockResolvedValue(0);

			const result = await service.getAllUsers({
				take: 10,
				skip: 0,
				page: 1,
			});

			expect(result).toEqual({
				total: 0,
				page: 1,
				limit: 10,
				items: [],
			});
		});
	});

	describe('toggleFavorite', () => {
		it('должен удалять избранное, если оно уже существует', async () => {
			(prisma.favorites.findFirst as jest.Mock).mockResolvedValue(
				mockFavorites,
			);
			(prisma.favorites.delete as jest.Mock).mockResolvedValue(
				mockFavorites,
			);

			const result = await service.toggleFavorite(
				'product-id-123',
				'user-id-123',
			);

			expect(result).toBe(true);
			expect(prisma.favorites.findFirst).toHaveBeenCalledWith({
				where: {
					userId: 'user-id-123',
					productId: 'product-id-123',
				},
			});
			expect(prisma.favorites.delete).toHaveBeenCalledWith({
				where: {
					id: mockFavorites.id,
				},
			});
		});

		it('должен создавать избранное, если его не существует', async () => {
			(prisma.favorites.findFirst as jest.Mock).mockResolvedValue(null);
			(prisma.favorites.create as jest.Mock).mockResolvedValue(
				mockFavorites,
			);

			const result = await service.toggleFavorite(
				'product-id-123',
				'user-id-123',
			);

			expect(result).toBe(true);
			expect(prisma.favorites.create).toHaveBeenCalledWith({
				data: {
					userId: 'user-id-123',
					productId: 'product-id-123',
				},
			});
		});
	});

	describe('create', () => {
		it('должен создавать нового пользователя с хешированным паролем', async () => {
			const hashedPassword = 'hashedPassword123';
			(hash as jest.Mock).mockResolvedValue(hashedPassword);
			(prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

			const result = await service.create(mockAuthDto);

			expect(result).toEqual({
				id: mockUser.id,
				vkId: mockUser.vkId,
				email: mockUser.email,
				name: mockUser.name,
				avatar: mockUser.avatar,
				role: mockUser.role,
			});
			expect(hash).toHaveBeenCalledWith(mockAuthDto.password);
			expect(prisma.user.create).toHaveBeenCalledWith({
				data: {
					email: mockAuthDto.email,
					name: mockAuthDto.name,
					avatar: '/uploads/noavatar.png',
					password: hashedPassword,
				},
			});
		});

		it('должен обрабатывать ошибки при создании пользователя', async () => {
			(hash as jest.Mock).mockRejectedValue(new Error('Hash error'));

			await expect(service.create(mockAuthDto)).rejects.toThrow(
				'Hash error',
			);
		});

		it('должен создавать пользователя без vkId, если он не указан', async () => {
			const authDtoWithoutVkId: AuthDto = {
				email: 'test2@example.com',
				password: 'password456',
				name: 'Test User 2',
				vkId: undefined,
			};

			const userWithoutVkId = {
				...mockUser,
				id: 'user-id-456',
				email: 'test2@example.com',
				name: 'Test User 2',
				vkId: null,
			};

			const hashedPassword = 'hashedPassword456';
			(hash as jest.Mock).mockResolvedValue(hashedPassword);
			(prisma.user.create as jest.Mock).mockResolvedValue(
				userWithoutVkId,
			);

			const result = await service.create(authDtoWithoutVkId);

			expect(result).toEqual({
				id: userWithoutVkId.id,
				vkId: userWithoutVkId.vkId,
				email: userWithoutVkId.email,
				name: userWithoutVkId.name,
				avatar: userWithoutVkId.avatar,
				role: userWithoutVkId.role,
			});
		});
	});

	describe('profileCreate', () => {
		it('должен создавать профиль пользователя', async () => {
			(prisma.profile.create as jest.Mock).mockResolvedValue(mockProfile);

			const result = await service.profileCreate(
				'user-id-123',
				mockProfileDto,
			);

			expect(result).toEqual(mockProfile);
			expect(prisma.profile.create).toHaveBeenCalledWith({
				data: {
					address: mockProfileDto.address,
					firstName: mockProfileDto.firstName,
					lastName: mockProfileDto.lastName,
					phone: mockProfileDto.phone,
					userId: 'user-id-123',
				},
			});
		});
	});

	describe('profileUpdate', () => {
		it('должен обновлять профиль пользователя', async () => {
			(prisma.user.findUnique as jest.Mock).mockResolvedValue(
				mockUserWithProfile,
			);
			(redis.del as jest.Mock).mockResolvedValue(1);
			(prisma.profile.update as jest.Mock).mockResolvedValue(mockProfile);

			const result = await service.profileUpdate(
				'user-id-123',
				mockProfileDto,
			);

			expect(result).toEqual(mockProfile);
			expect(redis.del).toHaveBeenCalledWith('user_user-id-123');
			expect(prisma.profile.update).toHaveBeenCalledWith({
				where: {
					id: mockUserWithProfile.profile.id,
				},
				data: mockProfileDto,
			});
		});

		it('должен бросать NotFoundException, если профиль не найден', async () => {
			const userWithoutProfile = {
				...mockUserWithProfile,
				profile: null,
			};
			(prisma.user.findUnique as jest.Mock).mockResolvedValue(
				userWithoutProfile,
			);

			await expect(
				service.profileUpdate('user-id-123', mockProfileDto),
			).rejects.toThrow(NotFoundException);
			await expect(
				service.profileUpdate('user-id-123', mockProfileDto),
			).rejects.toThrow('Профиль пользователя не найден');

			expect(redis.del).not.toHaveBeenCalled();
			expect(prisma.profile.update).not.toHaveBeenCalled();
		});

		it('должен обрабатывать ошибки при обновлении профиля', async () => {
			(prisma.user.findUnique as jest.Mock).mockResolvedValue(
				mockUserWithProfile,
			);
			(redis.del as jest.Mock).mockRejectedValue(
				new Error('Redis error'),
			);

			await expect(
				service.profileUpdate('user-id-123', mockProfileDto),
			).rejects.toThrow('Redis error');
		});
	});

	describe('интеграционные тесты', () => {
		it('должен корректно работать с пустыми данными профиля', async () => {
			const emptyProfileDto: ProfileDto = {
				address: '',
				firstName: '',
				lastName: '',
				phone: '',
			};

			(prisma.profile.create as jest.Mock).mockResolvedValue({
				...mockProfile,
				...emptyProfileDto,
			});

			const result = await service.profileCreate(
				'user-id-123',
				emptyProfileDto,
			);

			expect(result.address).toBe('');
			expect(result.firstName).toBe('');
			expect(result.lastName).toBe('');
			expect(result.phone).toBe('');
		});

		it('должен корректно работать с длинными строками', async () => {
			const longProfileDto: ProfileDto = {
				address:
					'Очень длинный адрес с множеством символов для тестирования граничных случаев и проверки корректной работы с большими текстами',
				firstName: 'Очень длинное имя с множеством символов',
				lastName: 'Очень длинная фамилия с множеством символов',
				phone: '+12345678901234567890',
			};

			(prisma.profile.create as jest.Mock).mockResolvedValue({
				...mockProfile,
				...longProfileDto,
			});

			const result = await service.profileCreate(
				'user-id-123',
				longProfileDto,
			);

			expect(result.address).toBe(longProfileDto.address);
			expect(result.firstName).toBe(longProfileDto.firstName);
			expect(result.lastName).toBe(longProfileDto.lastName);
			expect(result.phone).toBe(longProfileDto.phone);
		});

		it('должен корректно работать с специальными символами', async () => {
			const specialProfileDto: ProfileDto = {
				address: 'Адрес с символами: !@#$%^&*()_+-=[]{}|;:,.<>?',
				firstName: 'Имя с символами: !@#$%^&*()_+-=[]{}|;:,.<>?',
				lastName: 'Фамилия с символами: !@#$%^&*()_+-=[]{}|;:,.<>?',
				phone: '+1-234-567-8900',
			};

			(prisma.profile.create as jest.Mock).mockResolvedValue({
				...mockProfile,
				...specialProfileDto,
			});

			const result = await service.profileCreate(
				'user-id-123',
				specialProfileDto,
			);

			expect(result.address).toBe(specialProfileDto.address);
			expect(result.firstName).toBe(specialProfileDto.firstName);
			expect(result.lastName).toBe(specialProfileDto.lastName);
			expect(result.phone).toBe(specialProfileDto.phone);
		});
	});
});
