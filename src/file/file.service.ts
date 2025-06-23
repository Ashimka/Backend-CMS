import {
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from '@nestjs/common'
import { path } from 'app-root-path'
import { resolve } from 'path'
import { unlink } from 'fs/promises'
import { ensureDir, writeFile } from 'fs-extra'
import { FileResponse } from './file.interface'

@Injectable()
export class FileService {
	async saveFiles(files: Express.Multer.File[], folder: string = 'products') {
		const uploadedFolder = `${path}/uploads/${folder}`

		await ensureDir(uploadedFolder)

		const response: FileResponse[] = await Promise.all(
			files.map(async file => {
				const originalName = `${Date.now()}-${file.originalname}`

				await writeFile(
					`${uploadedFolder}/${originalName}`,
					file.buffer,
				)

				return {
					url: `/uploads/${folder}/${originalName}`,
					name: originalName,
				}
			}),
		)

		return response
	}

	async deleteFile(name: string, folder: string = 'products') {
		try {
			await unlink(resolve(`${path}/uploads/${folder}`, name))

			return { message: 'Файл успешно удален' }
		} catch (err) {
			if (err.code === 'ENOENT') {
				throw new NotFoundException('Файл не найден')
			}
			throw new InternalServerErrorException('Ошибка при удалении файла')
		}
	}
}
