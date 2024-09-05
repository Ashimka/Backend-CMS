import { IsString } from 'class-validator'

export class ProfileDto {
	@IsString({
		message: 'Адресс доставки',
	})
	address: string

	@IsString({
		message: 'Ваше имя',
	})
	firstName: string

	@IsString({
		message: 'Ваша фамилия',
	})
	lastName: string

	@IsString({
		message: 'Номер телефона',
	})
	phone: string
}
