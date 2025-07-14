import { Prisma } from '@prisma/client'

export type UserProfile = Prisma.UserGetPayload<{
	select: {
		id: true
		email: true
		name: true
		avatar: true
		role: true
		profile: {
			select: {
				id: true
				address: true
				firstName: true
				lastName: true
				phone: true
			}
		}
	}
}>
