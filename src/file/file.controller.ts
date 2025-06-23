import {
	Controller,
	Delete,
	HttpCode,
	Param,
	Post,
	Query,
	UploadedFiles,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { Role } from '@prisma/client'
import { FileService } from './file.service'
import { Auth } from 'src/auth/decorators/auth.decorator'
import { RolesGuard } from 'src/auth/guards/role.guard'
import { Roles } from 'src/auth/decorators/roles.decorator'

@Controller('file')
export class FileController {
	constructor(private readonly fileService: FileService) {}

	@HttpCode(200)
	@UseInterceptors(FilesInterceptor('files'))
	@Auth()
	@Post()
	async saveFiles(
		@UploadedFiles() files: Express.Multer.File[],
		@Query('folder') folder?: string,
	) {
		return this.fileService.saveFiles(files, folder)
	}

	@HttpCode(204)
	@UseGuards(RolesGuard)
	@Roles(Role.ADMIN)
	@Auth()
	@Delete('/:name')
	async deleteFile(
		@Param('name') name: string,
		@Query('folder') folder?: string,
	) {
		return await this.fileService.deleteFile(name, folder)
	}
}
