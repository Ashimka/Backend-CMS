import {
	IsEmail,
	IsNumber,
	IsOptional,
	IsString,
	MinLength,
} from 'class-validator'

export class AuthDto {
	@IsOptional()
	@IsString()
	name: string

	@IsOptional()
	@IsNumber()
	vkId: number

	@IsString({
		message: 'Email обязателен',
	})
	@IsEmail()
	email: string

	@MinLength(6, {
		message: 'Пароль должен состоять не менее 6 символов!',
	})
	@IsString({
		message: 'Пароль обязателен',
	})
	password: string
}
