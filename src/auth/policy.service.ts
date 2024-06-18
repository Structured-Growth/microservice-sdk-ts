import { inject, injectable } from "tsyringe";
import { ServerError } from "../common/errors/server.error";
import { LoggerInterface } from "../logger/interfaces/logger.interface";

@injectable()
export class PolicyService {
	constructor(
		@inject("policiesServiceUrl") private policiesServiceUrl: string,
		@inject("Logger") private logger: LoggerInterface
	) {}

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

		let data: any;

		try {
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
			data = await result.json();
		} catch (e) {
			this.logger.error("Error checking policy", e.message);
			throw new ServerError("Policies service is not available");
		}

		if (!data?.effect) {
			throw new ServerError("Bad response from the policies service: " + JSON.stringify(data));
		}

		return {
			effect: data.effect,
		};
	}
}
