import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from '../prisma.service';
import { OrderDto, OrderItemDto } from './dto/order.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EnumOrderStatus } from '@prisma/client';

describe('OrderService', () => {
	let service: OrderService;
	let mockPrismaService: any;

	const mockOrderItemDto: OrderItemDto = {
		quantity: 2,
		price: 100,
		productId: 'product-1',
	};

	const mockOrderDto: OrderDto = {
		status: EnumOrderStatus.PENDING,
		items: [mockOrderItemDto],
	};

	const mockUserId = 'user-123';

	const mockCreatedOrder = {
		id: 'order-123',
		status: EnumOrderStatus.PENDING,
		total: 200,
		userId: mockUserId,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	const mockOrderItems = [
		{
			id: 'item-1',
			quantity: 2,
			price: 100,
			product: {
				title: 'Test Product',
			},
		},
	];

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				OrderService,
				{
					provide: PrismaService,
					useValue: {
						order: {
							create: jest.fn(),
						},
						orderItem: {
							findMany: jest.fn(),
						},
					},
				},
			],
		}).compile();

		service = module.get<OrderService>(OrderService);
		mockPrismaService = module.get(PrismaService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('createOrder', () => {
		it('должен успешно создать заказ с одним товаром', async () => {
			mockPrismaService.order.create.mockResolvedValue(mockCreatedOrder);

			const result = await service.createOrder(mockOrderDto, mockUserId);

			expect(mockPrismaService.order.create).toHaveBeenCalledWith({
				data: {
					status: mockOrderDto.status,
					items: {
						create: [
							{
								quantity: mockOrderItemDto.quantity,
								price: mockOrderItemDto.price,
								product: {
									connect: {
										id: mockOrderItemDto.productId,
									},
								},
							},
						],
					},
					total: 200, // 2 * 100
					user: {
						connect: {
							id: mockUserId,
						},
					},
				},
			});
			expect(result).toEqual(mockCreatedOrder);
		});

		it('должен успешно создать заказ с несколькими товарами', async () => {
			const multipleItemsDto: OrderDto = {
				status: EnumOrderStatus.PENDING,
				items: [
					{ quantity: 2, price: 100, productId: 'product-1' },
					{ quantity: 1, price: 50, productId: 'product-2' },
				],
			};

			mockPrismaService.order.create.mockResolvedValue(mockCreatedOrder);

			const result = await service.createOrder(
				multipleItemsDto,
				mockUserId,
			);

			expect(mockPrismaService.order.create).toHaveBeenCalledWith({
				data: {
					status: multipleItemsDto.status,
					items: {
						create: [
							{
								quantity: 2,
								price: 100,
								product: {
									connect: {
										id: 'product-1',
									},
								},
							},
							{
								quantity: 1,
								price: 50,
								product: {
									connect: {
										id: 'product-2',
									},
								},
							},
						],
					},
					total: 250, // (2 * 100) + (1 * 50)
					user: {
						connect: {
							id: mockUserId,
						},
					},
				},
			});
			expect(result).toEqual(mockCreatedOrder);
		});

		it('должен корректно рассчитать общую сумму заказа', async () => {
			const complexOrderDto: OrderDto = {
				status: EnumOrderStatus.PENDING,
				items: [
					{ quantity: 3, price: 25.5, productId: 'product-1' },
					{ quantity: 1, price: 99.99, productId: 'product-2' },
				],
			};

			mockPrismaService.order.create.mockResolvedValue(mockCreatedOrder);

			await service.createOrder(complexOrderDto, mockUserId);

			expect(mockPrismaService.order.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					total: 176.49, // (3 * 25.50) + (1 * 99.99)
				}),
			});
		});

		it('должен выбросить BadRequestException при ошибке создания заказа', async () => {
			const error = new Error('Database connection failed');
			mockPrismaService.order.create.mockRejectedValue(error);

			await expect(
				service.createOrder(mockOrderDto, mockUserId),
			).rejects.toThrow(BadRequestException);
			await expect(
				service.createOrder(mockOrderDto, mockUserId),
			).rejects.toThrow('Не удалось создать заказ');
		});

		it('должен корректно обрабатывать заказ с нулевым количеством товаров', async () => {
			const zeroQuantityDto: OrderDto = {
				status: EnumOrderStatus.PENDING,
				items: [{ quantity: 0, price: 100, productId: 'product-1' }],
			};

			mockPrismaService.order.create.mockResolvedValue(mockCreatedOrder);

			await service.createOrder(zeroQuantityDto, mockUserId);

			expect(mockPrismaService.order.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					total: 0, // 0 * 100
				}),
			});
		});

		it('должен корректно обрабатывать заказ с дробными ценами', async () => {
			const fractionalPriceDto: OrderDto = {
				status: EnumOrderStatus.PENDING,
				items: [{ quantity: 2, price: 10.99, productId: 'product-1' }],
			};

			mockPrismaService.order.create.mockResolvedValue(mockCreatedOrder);

			await service.createOrder(fractionalPriceDto, mockUserId);

			expect(mockPrismaService.order.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					total: 21.98, // 2 * 10.99
				}),
			});
		});
	});

	describe('getOrdersDetails', () => {
		it('должен успешно получить детали заказа', async () => {
			mockPrismaService.orderItem.findMany.mockResolvedValue(
				mockOrderItems,
			);

			const result = await service.getOrdersDetails('order-123');

			expect(mockPrismaService.orderItem.findMany).toHaveBeenCalledWith({
				where: {
					orderId: 'order-123',
				},
				select: {
					id: true,
					quantity: true,
					price: true,
					product: {
						select: {
							title: true,
						},
					},
				},
			});

			expect(result).toEqual([
				{
					id: 'item-1',
					quantity: 2,
					price: 100,
					title: 'Test Product',
				},
			]);
		});

		it('должен выбросить NotFoundException если заказ не найден', async () => {
			mockPrismaService.orderItem.findMany.mockResolvedValue([]);

			await expect(
				service.getOrdersDetails('non-existent-order'),
			).rejects.toThrow(NotFoundException);
			await expect(
				service.getOrdersDetails('non-existent-order'),
			).rejects.toThrow('Заказ не найден');
		});

		it('должен корректно обрабатывать заказ с несколькими товарами', async () => {
			const multipleItems = [
				{
					id: 'item-1',
					quantity: 2,
					price: 100,
					product: {
						title: 'Product 1',
					},
				},
				{
					id: 'item-2',
					quantity: 1,
					price: 50,
					product: {
						title: 'Product 2',
					},
				},
			];

			mockPrismaService.orderItem.findMany.mockResolvedValue(
				multipleItems,
			);

			const result = await service.getOrdersDetails('order-123');

			expect(result).toEqual([
				{
					id: 'item-1',
					quantity: 2,
					price: 100,
					title: 'Product 1',
				},
				{
					id: 'item-2',
					quantity: 1,
					price: 50,
					title: 'Product 2',
				},
			]);
		});

		it('должен корректно обрабатывать заказ с нулевым количеством товаров', async () => {
			const zeroQuantityItems = [
				{
					id: 'item-1',
					quantity: 0,
					price: 100,
					product: {
						title: 'Product 1',
					},
				},
			];

			mockPrismaService.orderItem.findMany.mockResolvedValue(
				zeroQuantityItems,
			);

			const result = await service.getOrdersDetails('order-123');

			expect(result).toEqual([
				{
					id: 'item-1',
					quantity: 0,
					price: 100,
					title: 'Product 1',
				},
			]);
		});

		it('должен корректно обрабатывать заказ с дробными ценами', async () => {
			const fractionalPriceItems = [
				{
					id: 'item-1',
					quantity: 1,
					price: 19.99,
					product: {
						title: 'Product 1',
					},
				},
			];

			mockPrismaService.orderItem.findMany.mockResolvedValue(
				fractionalPriceItems,
			);

			const result = await service.getOrdersDetails('order-123');

			expect(result).toEqual([
				{
					id: 'item-1',
					quantity: 1,
					price: 19.99,
					title: 'Product 1',
				},
			]);
		});
	});

	describe('интеграционные тесты', () => {
		it('должен корректно работать с различными статусами заказов', async () => {
			const statuses = [EnumOrderStatus.PENDING, EnumOrderStatus.PAYED];

			for (const status of statuses) {
				const orderDto: OrderDto = {
					status,
					items: [mockOrderItemDto],
				};

				mockPrismaService.order.create.mockResolvedValue({
					...mockCreatedOrder,
					status,
				});

				const result = await service.createOrder(orderDto, mockUserId);

				expect(result.status).toBe(status);
			}
		});

		it('должен корректно обрабатывать пустой массив товаров в заказе', async () => {
			const emptyOrderDto: OrderDto = {
				status: EnumOrderStatus.PENDING,
				items: [],
			};

			mockPrismaService.order.create.mockResolvedValue({
				...mockCreatedOrder,
				total: 0,
			});

			const result = await service.createOrder(emptyOrderDto, mockUserId);

			expect(result.total).toBe(0);
		});
	});
});
