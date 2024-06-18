import { AuthenticatedAccountInterface } from "./authenticated-account.interface";

export interface AuthServiceInterface {
	/**
	 * Get authenticated user by JWT access token. This method calls OAuth server in order to
	 * validate access token and retrieve user info.
	 *
	 * @throws UnauthorizedError if token is invalid or expired
	 * @throws ServerError if the server responded incorrectly
	 */
	getAuthenticatedUser(accessToken: string): Promise<AuthenticatedAccountInterface>;
}
