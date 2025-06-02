import { RegionEnum } from "../../interfaces";
import { EventInterface } from "../event.interface";

export interface EventSingUpDataInterface {
	orgId: number;
	accountId: number;
	accountArn: string;
	firstName: string;
	lastName: string;
	email?: string;
	phone?: string;
	allowMarketingEmails: boolean;
}

export class EventSignUp implements EventInterface {
	constructor(
		private appPrefix: string,
		private orgId: number,
		private region: RegionEnum,
		private accountId: number,
		private eventData: EventSingUpDataInterface
	) {}

	get arn() {
		return `${this.appPrefix}:${this.region}:${this.orgId}:${this.accountId}:events/sign-up`;
	}

	get data() {
		return this.eventData;
	}
}
