import { inject, injectable } from "tsyringe";
import { AuthenticatedAccountInterface } from "./interfaces/authenticated-account.interface";
import { BadRequestError } from "../common/errors/bad-request.error";
import { UnauthorizedError } from "../common/errors/unauthorized.error";
import { RegionEnum } from "../interfaces";
import { AuthServiceInterface } from "./interfaces/auth-service.interface";

/**
 * Authenticate users in test cases
 */
@injectable()
export class AuthTestService implements AuthServiceInterface {
	constructor(@inject("appPrefix") private appPrefix: string) {}

	public async getAuthenticatedUser(accessToken: string): Promise<AuthenticatedAccountInterface> {
		const testAccessToken = "test";

		if (!accessToken) {
			throw new BadRequestError(`Access token was not provided`);
		}

		if (accessToken === testAccessToken) {
			return {
				id: 1,
				orgId: 1,
				region: RegionEnum.US,
				firstName: "Test",
				lastName: "User",
				email: "test@example.com",
				image: null,
				tags: [],
				arn: `${this.appPrefix}:us:1:1`,
			};
		} else {
			throw new UnauthorizedError("Invalid access token");
		}
	}
}
