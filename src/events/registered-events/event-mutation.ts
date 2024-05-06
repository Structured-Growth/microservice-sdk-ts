import { EventInterface } from "../event.interface";
import { autoInjectable, inject } from "tsyringe";

export interface EventMutationDataInterface {
	principalArn: string;
	resourceArn: string;
	action: string;
	changes: string;
}

@autoInjectable()
export class EventMutation implements EventInterface {
	constructor(
		private principalArn: string,
		private resourceArn: string,
		private action: string,
		private changes: string,
		@inject("appPrefix") private appPrefix?: string
	) {}

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
