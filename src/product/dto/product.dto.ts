import { IsNotEmpty, IsNumber, IsString } from 'class-validator'

export class ProductDto {
	@IsString({
		message: 'Название обязательно',
	})
	@IsNotEmpty({ message: 'Название не может быть пустым' })
	title: string

	@IsString({ message: 'Описание обязательно' })
	@IsNotEmpty({ message: 'Описание не может быть пустым' })
	description: string

	@IsNumber({}, { message: 'Цена должна быть числом' })
	@IsNotEmpty({ message: 'Цена не может быть пустой' })
	price: number

	@IsString({
		message: 'Укажите хотя бы одну картинку',
		each: true,
	})
	@IsNotEmpty({
		each: true,
		message: 'Путь к картинке не может быть пустым',
	})
	images: string[]

	@IsString({
		message: 'Категория обязательна',
	})
	@IsNotEmpty({ message: 'ID категории не может быть пустым' })
	categoryId: string
}
