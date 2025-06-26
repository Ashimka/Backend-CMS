import { Module } from '@nestjs/common'
import { FileService } from './file.service'
import { FileController } from './file.controller'
import { ServeStaticModule } from '@nestjs/serve-static'
import { path } from 'app-root-path'
import * as fs from 'fs'

@Module({
	imports: [
		ServeStaticModule.forRoot({
			rootPath: `${path}/uploads`,
			serveRoot: '/uploads',
		}),
	],
	controllers: [FileController],
	providers: [FileService],
})
export class FileModule {
	constructor() {
		const uploadsPath = `${path}/uploads`
		if (!fs.existsSync(uploadsPath)) {
			fs.mkdirSync(uploadsPath, { recursive: true })
			console.log(`Created uploads directory: ${uploadsPath}`)
		}
	}
}
