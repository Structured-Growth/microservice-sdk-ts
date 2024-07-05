import { PrincipalInterface } from "./principal.interface";

export interface AuthServiceInterface {
	/**
	 * Get authenticated user or service by JWT access token.
	 * This method calls OAuth server in order to validate access token and retrieve user info.
	 * Additionally, it tries to check if request is internal and signed with internal JWT token.
	 *
	 * @throws UnauthorizedError if token is invalid or expired
	 * @throws ServerError if the server responded incorrectly
	 */
	authenticateByAccessToken(accessToken: string): Promise<PrincipalInterface>;
}
