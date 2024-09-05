import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { Params, Profile, Strategy, VerifyCallback } from 'passport-vkontakte'

@Injectable()
export class VkStrategy extends PassportStrategy(Strategy, 'vk') {
	constructor(private configService: ConfigService) {
		super(
			{
				clientID: configService.get('VK_CLIENT_ID'),
				clientSecret: configService.get('VK_CLIENT_SECRET'),
				callbackURL: 'http://localhost/auth/vk/callback',
			},
			async function validate(
				_accessToken: string,
				_refreshToken: string,
				_params: Params,
				profile: Profile,
				done: VerifyCallback,
			) {
				const user = {
					vkId: profile.id,
					name: profile.displayName,
					avatar: profile.photos[0].value,
				}
				done(null, user)
			},
		)
	}
}
