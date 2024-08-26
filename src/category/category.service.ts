import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { CategoryDto } from './dto/category.dto'

@Injectable()
export class CategoryService {
	constructor(private prisma: PrismaService) {}

	async getAll() {
		return await this.prisma.category.findMany({
			select: {
				id: true,
				title: true,
				createdAt: true,
			},
		})
	}

	async getById(id: string) {
		const category = await this.prisma.category.findUnique({
			where: {
				id,
			},
		})

		if (!category) throw new NotFoundException('Категория не найдена')

		return category
	}

	async create(dto: CategoryDto) {
		return this.prisma.category.create({
			data: {
				title: dto.title,
				description: dto.description,
			},
		})
	}

	async update(id: string, dto: CategoryDto) {
		await this.getById(id)

		return this.prisma.category.update({
			where: { id },
			data: dto,
		})
	}

	async delete(id: string) {
		await this.getById(id)

		return this.prisma.category.delete({
			where: { id },
		})
	}
}
