import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	Post,
	Put,
	UseGuards,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common'
import { Auth } from 'src/auth/decorators/auth.decorator'
import { CategoryService } from './category.service'
import { CategoryDto } from './dto/category.dto'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { Role } from '@prisma/client'
import { RolesGuard } from 'src/auth/guards/role.guard'
import { Public } from 'src/auth/decorators/public.decorator'

@Controller('categories')
export class CategoryController {
	constructor(private readonly categoryService: CategoryService) {}

	@Public()
	@Get('/')
	async getAll() {
		return this.categoryService.getAll()
	}

	@Public()
	@Get('by-id/:id')
	async getById(@Param('id') id: string) {
		return this.categoryService.getById(id)
	}

	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@Auth()
	@UseGuards(RolesGuard)
	@Roles(Role.ADMIN)
	@Post('/')
	async create(@Body() dto: CategoryDto) {
		return this.categoryService.create(dto)
	}

	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@UseGuards(RolesGuard)
	@Roles(Role.ADMIN)
	@Put(':id')
	async update(@Param('id') id: string, @Body() dto: CategoryDto) {
		return this.categoryService.update(id, dto)
	}

	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@UseGuards(RolesGuard)
	@Roles(Role.ADMIN)
	@Delete(':id')
	async delete(@Param('id') id: string) {
		return this.categoryService.delete(id)
	}
}
