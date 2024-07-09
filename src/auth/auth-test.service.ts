import { inject, injectable } from "tsyringe";
import { BadRequestError } from "../common/errors/bad-request.error";
import { UnauthorizedError } from "../common/errors/unauthorized.error";
import { RegionEnum } from "../interfaces";
import { AuthServiceInterface } from "./interfaces/auth-service.interface";
import { PrincipalInterface } from "./interfaces/principal.interface";
import { PrincipalTypeEnum } from "./interfaces/principal-type.enum";

/**
 * Authenticate users in test cases
 */
@injectable()
export class AuthTestService implements AuthServiceInterface {
	constructor(@inject("appPrefix") private appPrefix: string) {}

	public async authenticateByAccessToken(accessToken: string): Promise<PrincipalInterface> {
		const testAccessToken = "test";

		if (!accessToken) {
			throw new BadRequestError(`Access token was not provided`);
		}

		if (accessToken === testAccessToken) {
			return {
				id: 1,
				orgId: 1,
				region: RegionEnum.US,
				type: PrincipalTypeEnum.ACCOUNT,
				firstName: "Test",
				lastName: "User",
				email: "test@example.com",
				image: null,
				arn: `${this.appPrefix}:us:1:1`,
			};
		} else {
			throw new UnauthorizedError("Invalid access token");
		}
	}
}
