import { Prisma } from '@prisma/client'

export type UserProfile = Prisma.UserGetPayload<{
	select: {
		id: true
		email: true
		name: true
		avatar: true
		role: true
		reviews: true
		favorites: {
			select: {
				products: {
					select: {
						id: true
						title: true
						description: true
						images: true
						price: true
						category: {
							select: {
								id: true
								title: true
								description: true
							}
						}
					}
				}
			}
		}
		profile: {
			select: {
				id: true
				address: true
				firstName: true
				lastName: true
				phone: true
			}
		}
		orders: true
	}
}>
