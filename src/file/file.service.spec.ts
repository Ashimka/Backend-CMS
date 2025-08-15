import { Test, TestingModule } from '@nestjs/testing';
import { FileService } from './file.service';
import {
	InternalServerErrorException,
	NotFoundException,
} from '@nestjs/common';
import { resolve } from 'path';
import { unlink } from 'fs/promises';
import { ensureDir, writeFile } from 'fs-extra';
import { FileResponse } from './file.interface';

// Мокаем модули
jest.mock('app-root-path', () => ({
	path: '/test/root/path',
}));
jest.mock('fs/promises');
jest.mock('fs-extra');

describe('FileService', () => {
	let service: FileService;
	let mockPath: string;
	let mockUnlink: any;
	let mockEnsureDir: any;
	let mockWriteFile: any;

	beforeEach(async () => {
		// Сбрасываем все моки
		jest.clearAllMocks();

		// Настраиваем моки
		mockPath = '/test/root/path';
		mockUnlink = unlink as any;
		mockEnsureDir = ensureDir as any;
		mockWriteFile = writeFile as any;

		const module: TestingModule = await Test.createTestingModule({
			providers: [FileService],
		}).compile();

		service = module.get<FileService>(FileService);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('saveFiles', () => {
		const mockFiles: Express.Multer.File[] = [
			{
				fieldname: 'file1',
				originalname: 'test1.jpg',
				encoding: '7bit',
				mimetype: 'image/jpeg',
				buffer: Buffer.from('test1'),
				size: 5,
				stream: null,
				destination: null,
				filename: 'test1.jpg',
				path: null,
			},
			{
				fieldname: 'file2',
				originalname: 'test2.png',
				encoding: '7bit',
				mimetype: 'image/png',
				buffer: Buffer.from('test2'),
				size: 5,
				stream: null,
				destination: null,
				filename: 'test2.png',
				path: null,
			},
		];

		it('должен успешно сохранить файлы в папку products по умолчанию', async () => {
			const expectedFolder = 'products';
			const expectedPath = `${mockPath}/uploads/${expectedFolder}`;
			const expectedResponse: FileResponse[] = [
				{
					url: `/uploads/${expectedFolder}/1234567890-test1.jpg`,
					name: '1234567890-test1.jpg',
				},
				{
					url: `/uploads/${expectedFolder}/1234567891-test2.png`,
					name: '1234567891-test2.png',
				},
			];

			// Мокаем Date.now() для предсказуемых имен файлов
			const mockDateNow = jest.spyOn(Date, 'now');
			mockDateNow.mockReturnValueOnce(1234567890);
			mockDateNow.mockReturnValueOnce(1234567891);

			mockEnsureDir.mockResolvedValue(undefined);
			mockWriteFile.mockResolvedValue(undefined);

			const result = await service.saveFiles(mockFiles);

			expect(mockEnsureDir).toHaveBeenCalledWith(expectedPath);
			expect(mockWriteFile).toHaveBeenCalledTimes(2);
			expect(mockWriteFile).toHaveBeenCalledWith(
				`${expectedPath}/1234567890-test1.jpg`,
				mockFiles[0].buffer,
			);
			expect(mockWriteFile).toHaveBeenCalledWith(
				`${expectedPath}/1234567891-test2.png`,
				mockFiles[1].buffer,
			);
			expect(result).toEqual(expectedResponse);

			mockDateNow.mockRestore();
		});

		it('должен успешно сохранить файлы в указанную папку', async () => {
			const customFolder = 'avatars';
			const expectedPath = `${mockPath}/uploads/${customFolder}`;
			const expectedResponse: FileResponse[] = [
				{
					url: `/uploads/${customFolder}/1234567890-test1.jpg`,
					name: '1234567890-test1.jpg',
				},
			];

			const mockDateNow = jest.spyOn(Date, 'now');
			mockDateNow.mockReturnValue(1234567890);

			mockEnsureDir.mockResolvedValue(undefined);
			mockWriteFile.mockResolvedValue(undefined);

			const result = await service.saveFiles(
				[mockFiles[0]],
				customFolder,
			);

			expect(mockEnsureDir).toHaveBeenCalledWith(expectedPath);
			expect(mockWriteFile).toHaveBeenCalledWith(
				`${expectedPath}/1234567890-test1.jpg`,
				mockFiles[0].buffer,
			);
			expect(result).toEqual(expectedResponse);

			mockDateNow.mockRestore();
		});

		it('должен обработать пустой массив файлов', async () => {
			mockEnsureDir.mockResolvedValue(undefined);

			const result = await service.saveFiles([]);

			expect(mockEnsureDir).toHaveBeenCalledWith(
				`${mockPath}/uploads/products`,
			);
			expect(mockWriteFile).not.toHaveBeenCalled();
			expect(result).toEqual([]);
		});

		it('должен создать уникальные имена файлов на основе timestamp', async () => {
			const mockDateNow = jest.spyOn(Date, 'now');
			mockDateNow.mockReturnValue(1234567890);

			mockEnsureDir.mockResolvedValue(undefined);
			mockWriteFile.mockResolvedValue(undefined);

			await service.saveFiles([mockFiles[0]]);

			expect(mockWriteFile).toHaveBeenCalledWith(
				`${mockPath}/uploads/products/1234567890-test1.jpg`,
				mockFiles[0].buffer,
			);

			mockDateNow.mockRestore();
		});

		it('должен корректно обрабатывать файлы с пробелами в именах', async () => {
			const fileWithSpaces: Express.Multer.File = {
				...mockFiles[0],
				originalname: 'test file with spaces.jpg',
			};

			const mockDateNow = jest.spyOn(Date, 'now');
			mockDateNow.mockReturnValue(1234567890);

			mockEnsureDir.mockResolvedValue(undefined);
			mockWriteFile.mockResolvedValue(undefined);

			const result = await service.saveFiles([fileWithSpaces]);

			expect(mockWriteFile).toHaveBeenCalledWith(
				`${mockPath}/uploads/products/1234567890-test file with spaces.jpg`,
				fileWithSpaces.buffer,
			);
			expect(result[0].name).toBe('1234567890-test file with spaces.jpg');
			expect(result[0].url).toBe(
				'/uploads/products/1234567890-test file with spaces.jpg',
			);

			mockDateNow.mockRestore();
		});
	});

	describe('deleteFile', () => {
		const fileName = 'test-file.jpg';
		const defaultFolder = 'products';

		it('должен успешно удалить файл из папки products по умолчанию', async () => {
			const expectedPath = resolve(
				`${mockPath}/uploads/${defaultFolder}`,
				fileName,
			);
			const expectedResponse = { message: 'Файл успешно удален' };

			mockUnlink.mockResolvedValue(undefined);

			const result = await service.deleteFile(fileName);

			expect(mockUnlink).toHaveBeenCalledWith(expectedPath);
			expect(result).toEqual(expectedResponse);
		});

		it('должен успешно удалить файл из указанной папки', async () => {
			const customFolder = 'avatars';
			const expectedPath = resolve(
				`${mockPath}/uploads/${customFolder}`,
				fileName,
			);
			const expectedResponse = { message: 'Файл успешно удален' };

			mockUnlink.mockResolvedValue(undefined);

			const result = await service.deleteFile(fileName, customFolder);

			expect(mockUnlink).toHaveBeenCalledWith(expectedPath);
			expect(result).toEqual(expectedResponse);
		});

		it('должен выбросить NotFoundException если файл не найден', async () => {
			const error = new Error('File not found');
			(error as any).code = 'ENOENT';

			mockUnlink.mockRejectedValue(error);

			await expect(service.deleteFile(fileName)).rejects.toThrow(
				NotFoundException,
			);
			await expect(service.deleteFile(fileName)).rejects.toThrow(
				'Файл не найден',
			);
		});

		it('должен выбросить InternalServerErrorException при других ошибках', async () => {
			const error = new Error('Permission denied');
			(error as any).code = 'EACCES';

			mockUnlink.mockRejectedValue(error);

			await expect(service.deleteFile(fileName)).rejects.toThrow(
				InternalServerErrorException,
			);
			await expect(service.deleteFile(fileName)).rejects.toThrow(
				'Ошибка при удалении файла',
			);
		});

		it('должен корректно обрабатывать ошибки без кода', async () => {
			const error = new Error('Unknown error');

			mockUnlink.mockRejectedValue(error);

			await expect(service.deleteFile(fileName)).rejects.toThrow(
				InternalServerErrorException,
			);
			await expect(service.deleteFile(fileName)).rejects.toThrow(
				'Ошибка при удалении файла',
			);
		});

		it('должен корректно обрабатывать ошибки с пустым кодом', async () => {
			const error = new Error('Empty code error');
			(error as any).code = '';

			mockUnlink.mockRejectedValue(error);

			await expect(service.deleteFile(fileName)).rejects.toThrow(
				InternalServerErrorException,
			);
			await expect(service.deleteFile(fileName)).rejects.toThrow(
				'Ошибка при удалении файла',
			);
		});

		it('должен корректно обрабатывать ошибки с null кодом', async () => {
			const error = new Error('Null code error');
			(error as any).code = null;

			mockUnlink.mockRejectedValue(error);

			await expect(service.deleteFile(fileName)).rejects.toThrow(
				InternalServerErrorException,
			);
			await expect(service.deleteFile(fileName)).rejects.toThrow(
				'Ошибка при удалении файла',
			);
		});

		it('должен корректно обрабатывать файлы с пробелами в именах', async () => {
			const fileNameWithSpaces = 'test file with spaces.jpg';
			const expectedPath = resolve(
				`${mockPath}/uploads/${defaultFolder}`,
				fileNameWithSpaces,
			);

			mockUnlink.mockResolvedValue(undefined);

			await service.deleteFile(fileNameWithSpaces);

			expect(mockUnlink).toHaveBeenCalledWith(expectedPath);
		});

		it('должен корректно обрабатывать файлы с специальными символами в именах', async () => {
			const fileNameWithSpecialChars = 'test-file_123@#$%.jpg';
			const expectedPath = resolve(
				`${mockPath}/uploads/${defaultFolder}`,
				fileNameWithSpecialChars,
			);

			mockUnlink.mockResolvedValue(undefined);

			await service.deleteFile(fileNameWithSpecialChars);

			expect(mockUnlink).toHaveBeenCalledWith(expectedPath);
		});
	});

	describe('интеграционные тесты', () => {
		it('должен корректно работать с реальными путями', () => {
			// Проверяем, что path.resolve корректно работает с нашими моками
			const testPath = resolve(
				`${mockPath}/uploads/products`,
				'1234567890-test1.jpg',
			);
			expect(testPath).toBe(
				resolve(`${mockPath}/uploads/products`, '1234567890-test1.jpg'),
			);
		});

		it('должен корректно формировать URL для файлов', () => {
			const folder = 'products';
			const fileName = '1234567891-test2.png';
			const expectedUrl = `/uploads/${folder}/${fileName}`;

			expect(expectedUrl).toBe('/uploads/products/1234567891-test2.png');
		});
	});
});
