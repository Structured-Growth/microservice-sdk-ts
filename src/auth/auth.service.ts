import { inject, injectable } from "tsyringe";
import { ServerError } from "../common/errors/server.error";
import { BadRequestError } from "../common/errors/bad-request.error";
import { UnauthorizedError } from "../common/errors/unauthorized.error";
import { AuthServiceInterface } from "./interfaces/auth-service.interface";
import { PrincipalInterface } from "./interfaces/principal.interface";
import { JwtService } from "./jwt.service";
import { PrincipalTypeEnum } from "./interfaces/principal-type.enum";

@injectable()
export class AuthService implements AuthServiceInterface {
	private jwtService: JwtService;

	constructor(
		@inject("oAuthServiceGetUserUrl") private oAuthServiceGetUserUrl: string,
		@inject("internalAuthenticationEnabled") private internalAuthenticationEnabled: boolean,
		@inject("internalAuthenticationJwtSecret") private internalAuthenticationJwtSecret: string,
		@inject("appPrefix") private appPrefix: string
	) {
		this.jwtService = new JwtService(this.internalAuthenticationJwtSecret);
	}

	public async authenticateByAccessToken(accessToken: string): Promise<PrincipalInterface> {
		const payload: any = this.jwtService.decode(accessToken);

		if (!payload) {
			throw new UnauthorizedError("Access token is invalid");
		}

		if (payload?.principal?.type === PrincipalTypeEnum.SERVICE) {
			if (this.internalAuthenticationEnabled) {
				return this.verifyInternalAccessToken(accessToken);
			} else {
				throw new UnauthorizedError(`Internal authentication is disabled`);
			}
		}

		return this.verifyAccessTokenViaOAuthServer(accessToken);
	}

	public generateInternalAccessToken(): string {
		const principal: PrincipalInterface = {
			id: this.appPrefix,
			orgId: null,
			region: null,
			type: PrincipalTypeEnum.SERVICE,
			arn: this.appPrefix,
		};
		return this.jwtService.sing({ principal });
	}

	private verifyInternalAccessToken(accessToken: string): PrincipalInterface {
		const payload: any = this.jwtService.verify(accessToken);
		return payload.principal;
	}

	private async verifyAccessTokenViaOAuthServer(accessToken: string): Promise<PrincipalInterface> {
		if (!this.oAuthServiceGetUserUrl) {
			throw new ServerError(`oAuthServiceGetUserUrl is not set`);
		}

		if (!accessToken) {
			throw new BadRequestError(`Access token was not provided`);
		}

		const result = await fetch(this.oAuthServiceGetUserUrl, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
		});

		const data: any = await result.json();

		if (data.error) {
			throw new UnauthorizedError(data.error);
		}

		if (!data.arn) {
			throw new ServerError(`Invalid response from OAuth server: ${JSON.stringify(data)}`);
		}

		return data;
	}
}
