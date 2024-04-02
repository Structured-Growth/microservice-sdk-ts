import { RegionEnum } from "../../interfaces";
import { EventInterface } from "../event.interface";

export interface EventTestDataInterface {
	test: string;
}

export class EventTest implements EventInterface {
	constructor(
		private appPrefix: string,
		private orgId: number,
		private region: RegionEnum,
		private accountId: number,
		private eventData: EventTestDataInterface
	) {}

	get arn() {
		return `${this.appPrefix}:${this.region}:${this.orgId}:${this.accountId || "-"}:events/test`;
	}

	get data() {
		return this.eventData;
	}
}
