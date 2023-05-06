import { ForbiddenException, Injectable } from "@nestjs/common";
import { User, Bookmark } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthDto } from "./dto";
import * as argon from 'argon2'
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
	constructor(
		private prisma: PrismaService,
		private jwt: JwtService,
		private config: ConfigService
	) {}
	async signup(dto: AuthDto) {
		//generate password
		const hash = await argon.hash(dto.name);

		// save the new user in the db
		try {
			const user = await this.prisma.user.create({
				data: {
					name: dto.name,
					email: dto.email,
					id: dto.id,
					nickname: dto.nickname,
					image: dto.image,
					hash,
				},
			})
			
			delete user.hash;
	
			// return the saved user
			return (this.signToken(dto));
		} catch (error) {
			if (error instanceof PrismaClientKnownRequestError) {
				if (error.code === 'P2002') {
					throw new ForbiddenException('Credentials taken');
				}
			}
			throw error;
		}

	}

	async signin(dto: AuthDto) {

		// find the user by email
		const user = await this.prisma.user.findUnique( {
			where: {
				email: dto.email,
			},
		});
		// if user not exist throw exception
		if (!user)
			throw new ForbiddenException('Credentials incorrect');

		// compare password
		/*const pwMatches = await argon.verify(user.hash,dto.password);
		// if password incorrect throw error
		if (!pwMatches)
			throw new ForbiddenException('Credentials incorrect');*/

		return (this.signToken(dto));
	}

	async signToken(dto: AuthDto) : Promise<{dto: AuthDto, access_token: string }> {
		const payload = {
			sub: dto.id,
			email: dto.email
		};
		const secret = this.config.get('JWT_SECRET');
		
		const token = await this.jwt.signAsync(payload,
			{
				expiresIn: '15m',
				secret: secret,
			},
		);

		return {
			dto,
			access_token: token
		};

	}
}
