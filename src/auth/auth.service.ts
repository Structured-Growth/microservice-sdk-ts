import { inject, injectable } from "tsyringe";
import { AuthenticatedAccountInterface } from "./interfaces/authenticated-account.interface";
import { ServerError } from "../common/errors/server.error";
import { BadRequestError } from "../common/errors/bad-request.error";
import { UnauthorizedError } from "../common/errors/unauthorized.error";
import { AuthServiceInterface } from "./interfaces/auth-service.interface";

@injectable()
export class AuthService implements AuthServiceInterface {
	constructor(@inject("oAuthServiceGetUserUrl") private oAuthServiceGetUserUrl: string) {}

	public async getAuthenticatedUser(accessToken: string): Promise<AuthenticatedAccountInterface> {
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
