import { IsString } from 'class-validator'

export class UpdateRoleDto {
	@IsString()
	id: string

	@IsString()
	role: string
}
