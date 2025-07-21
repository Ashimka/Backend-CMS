import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { AuthDto } from './dto/auth.dto';
import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('AuthService', () => {
	let authService: AuthService;
	let userService: UserService;
	let jwtService: JwtService;

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			providers: [
				AuthService,
				{
					provide: UserService,
					useValue: {
						isValidateUser: jest.fn(),
						create: jest.fn(),
					},
				},
				{
					provide: JwtService,
					useValue: {
						sign: jest.fn().mockReturnValue('mockToken'),
					},
				},
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn().mockReturnValue('mockSecret'),
					},
				},
				{
					provide: PrismaService,
					useValue: {},
				},
			],
		}).compile();

		authService = moduleRef.get<AuthService>(AuthService);
		userService = moduleRef.get<UserService>(UserService);
		jwtService = moduleRef.get<JwtService>(JwtService);
	});

	describe('register', () => {
		const mockAuthDto = {
			email: 'test@example.com',
			name: 'User test',
			password: 'password123',
		} as AuthDto;

		const mockUser = {
			id: '1',
			email: 'test@example.com',
			name: 'Test User',
			avatar: 'default-avatar.jpg',
			role: Role.USER,
			vkId: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		it('успешная регистрация нового пользователя', async () => {
			jest.spyOn(userService, 'isValidateUser').mockResolvedValue(null);
			jest.spyOn(userService, 'create').mockResolvedValue(mockUser);

			jest.spyOn(authService, 'issueTokens').mockReturnValue({
				accessToken: 'mockToken',
				refreshToken: 'mockToken',
			});

			const result = await authService.register(mockAuthDto);

			expect(userService.isValidateUser).toHaveBeenCalledWith(
				mockAuthDto.email,
			);
			expect(userService.create).toHaveBeenCalledWith(mockAuthDto);
			expect(result).toEqual({
				id: mockUser.id,
				email: mockUser.email,
				name: mockUser.name,
				avatar: mockUser.avatar,
				role: mockUser.role,
				refreshToken: 'mockToken',
				accessToken: 'mockToken',
			});
		});

		it('если пользователь существует получить BadRequestException', async () => {
			jest.spyOn(userService, 'isValidateUser').mockResolvedValue(
				mockUser,
			);

			await expect(authService.register(mockAuthDto)).rejects.toThrow(
				BadRequestException,
			);
			expect(userService.isValidateUser).toHaveBeenCalledWith(
				mockAuthDto.email,
			);
			expect(userService.create).not.toHaveBeenCalled();
		});

		it('токены создаются с правильными параметрами', async () => {
			jest.spyOn(userService, 'isValidateUser').mockResolvedValue(null);
			jest.spyOn(userService, 'create').mockResolvedValue(mockUser);

			const configServiceGetSpy = jest.spyOn(
				authService['configService'],
				'get',
			);
			configServiceGetSpy.mockImplementation((key: string) => {
				if (key === 'AT_EXP') return '1h';
				if (key === 'RT_EXP') return '7d';
				return 'mockSecret';
			});

			const jwtSignSpy = jest.spyOn(jwtService, 'sign');

			await authService.register(mockAuthDto);

			expect(jwtSignSpy).toHaveBeenCalledTimes(2);

			expect(jwtSignSpy).toHaveBeenCalledWith(
				{ id: mockUser.id, role: mockUser.role },
				{ expiresIn: '1h' },
			);
			expect(jwtSignSpy).toHaveBeenCalledWith(
				{ id: mockUser.id, role: mockUser.role },
				{ expiresIn: '7d' },
			);
		});

		it('логирование при успешной регистрации', async () => {
			jest.spyOn(userService, 'isValidateUser').mockResolvedValue(null);
			jest.spyOn(userService, 'create').mockResolvedValue(mockUser);
			const loggerSpy = jest.spyOn(authService['logger'], 'log');

			await authService.register(mockAuthDto);

			expect(loggerSpy).toHaveBeenCalledWith(
				`Регистрация пользователя: ${mockAuthDto.email}`,
			);
			expect(loggerSpy).toHaveBeenCalledWith(
				`Успешная регистрация: ${mockAuthDto.email} (id: ${mockUser.id})`,
			);
		});

		it('логирование при дубликате email', async () => {
			jest.spyOn(userService, 'isValidateUser').mockResolvedValue(
				mockUser,
			);
			const loggerSpy = jest.spyOn(authService['logger'], 'warn');

			await expect(authService.register(mockAuthDto)).rejects.toThrow();

			expect(loggerSpy).toHaveBeenCalledWith(
				`Отказ в регистрации: ${mockAuthDto.email} (Email уже зарегистрирован!)`,
			);
		});
	});
});
