import { inject, injectable } from "tsyringe";
import { ServerError } from "../common/errors/server.error";

@injectable()
export class PolicyService {
	constructor(@inject("policiesServiceUrl") private policiesServiceUrl: string) {}

	/**
	 * Check if principal is authorized to perform an action on resources.
	 * Policies microservices is used.
	 */
	public async check(
		principal: string,
		action: string,
		resources: string[]
	): Promise<{
		effect: "allow" | "deny";
	}> {
		if (!this.policiesServiceUrl) {
			throw new ServerError(`policiesServiceUrl is not set`);
		}

		const result = await fetch(`${this.policiesServiceUrl}/v1/policies/check`, {
			method: "POST",
			headers: {
				// Authorization: `Bearer ${accessToken}`,// TODO internal authentication
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				principal,
				action,
				resources,
			}),
		});

		const data: any = await result.json();

		if (!data.effect) {
			throw new ServerError("Bad response from the policies service: " + JSON.stringify(data));
		}

		return {
			effect: data.effect,
		};
	}
}
