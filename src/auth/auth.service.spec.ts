import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { BadRequestException } from '@nestjs/common';
import { AuthDto } from './dto/auth.dto';

describe('AuthService', () => {
	let authService: AuthService;
	let userService: jest.Mocked<UserService>;
	let jwtService: jest.Mocked<JwtService>;
	let configService: jest.Mocked<ConfigService>;
	let prismaService: jest.Mocked<PrismaService>;

	const mockVkId = 123456;

	const mockUserDto: AuthDto = {
		name: 'NewUser',
		email: 'new-user@mail.ru',
		password: 'password123456',
		vkId: mockVkId,
	};

	beforeEach(async () => {
		jest.clearAllMocks();
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AuthService,
				{
					provide: UserService,
					useValue: {
						isValidateUser: jest.fn(),
						create: jest.fn().mockResolvedValue(mockUserDto),
					},
				},
				{
					provide: JwtService,
					useValue: { sign: jest.fn().mockReturnValue('token') },
				},
				{
					provide: ConfigService,
					useValue: { get: jest.fn().mockReturnValue('1h') },
				},
				{ provide: PrismaService, useValue: {} },
			],
		}).compile();

		authService = module.get<AuthService>(AuthService);
		userService = module.get(UserService);
		jwtService = module.get(JwtService);
		configService = module.get(ConfigService);
		prismaService = module.get(PrismaService);
	});

	describe('register', () => {
		it('успешная регистрация нового пользователя', async () => {
			userService.isValidateUser.mockResolvedValue(null);

			const result = await authService.register(mockUserDto);

			expect(userService.isValidateUser).toHaveBeenCalledWith(
				mockUserDto.email,
			);
			expect(userService.create).toHaveBeenCalledWith(mockUserDto);
			expect(result).toEqual({
				user: mockUserDto,
				accessToken: 'token',
				refreshToken: 'token',
			});
		});

		it('ошибка при регистрации уже существующего пользователя', async () => {
			userService.isValidateUser.mockResolvedValue(mockUserDto.email);

			await expect(authService.register(mockUserDto)).rejects.toThrow(
				BadRequestException,
			);
			expect(userService.create).not.toHaveBeenCalled();
		});
	});
});
