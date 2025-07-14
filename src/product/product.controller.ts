import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	Post,
	Put,
	Query,
	UseGuards,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common'

import { ProductDto } from './dto/product.dto'
import { ProductService } from './product.service'
import { Public } from 'src/auth/decorators/public.decorator'
import { RolesGuard } from 'src/auth/guards/role.guard'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { Role } from '@prisma/client'

@Controller('products')
export class ProductController {
	constructor(private readonly productService: ProductService) {}

	@Public()
	@Get()
	async getAll(
		@Query('page') page: number = 1,
		@Query('limit') limit: number = 12,
		@Query('searchTerm') searchTerm?: string,
	) {
		const take = Math.min(limit, 24)
		const skip = (page - 1) * take
		return await this.productService.getAll({
			take,
			skip,
			searchTerm,
			page: +page,
		})
	}

	@Public()
	@Get('by-id/:id')
	async getById(@Param('id') id: string) {
		return this.productService.getById(id)
	}

	@Public()
	@Get('by-category/:categoryId')
	async getbyCategory(@Param('categoryId') categoryId: string) {
		return this.productService.getByCategory(categoryId)
	}

	@Public()
	@Get('most-popular')
	async getMostPopular() {
		return this.productService.getMostPopular()
	}

	@Public()
	@Get('similar/:id')
	async getSimilar(@Param('id') id: string) {
		return this.productService.getSimilar(id)
	}

	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@UseGuards(RolesGuard)
	@Roles(Role.ADMIN)
	@Post('')
	async create(@Body() dto: ProductDto) {
		return this.productService.create(dto)
	}

	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@UseGuards(RolesGuard)
	@Roles(Role.ADMIN)
	@Put(':id')
	async update(@Param('id') id: string, @Body() dto: ProductDto) {
		return this.productService.update(id, dto)
	}

	@HttpCode(200)
	@UseGuards(RolesGuard)
	@Roles(Role.ADMIN)
	@Delete(':id')
	async delete(@Param('id') id: string) {
		return this.productService.delete(id)
	}
}
