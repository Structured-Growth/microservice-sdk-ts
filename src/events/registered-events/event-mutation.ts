import { EventInterface } from "../event.interface";
import { container } from "tsyringe";

export interface EventMutationDataInterface {
	principalArn: string;
	resourceArn: string;
	action: string;
	changes: string;
}

export class EventMutation implements EventInterface {
	private readonly appPrefix: string;

	constructor(
		private principalArn: string,
		private resourceArn: string,
		private action: string,
		private changes: string
	) {
		this.appPrefix = container.resolve("appPrefix");
	}

	get arn() {
		return `${this.appPrefix}:-:-:-:events/mutation`;
	}

	get data() {
		return {
			principalArn: this.principalArn,
			resourceArn: this.resourceArn,
			action: this.action,
			changes: this.changes,
		};
	}
}
