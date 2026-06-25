import { inject, injectable } from "tsyringe";
import { EventbusInterface } from "./interfaces/eventbus.interface";
import { EventbusProviderInterface } from "./interfaces/eventbus-provider.interface";
import { EventInterface } from "../events";

@injectable()
export class EventbusService implements EventbusInterface {
	constructor(
		@inject("EventbusProvider") private eventbusProvider: EventbusProviderInterface,
		@inject("appPrefix") private appPrefix: string
	) {}

	public async publish(event: EventInterface): Promise<boolean> {
		const arn = event.arn.startsWith(this.appPrefix) ? event.arn : `${this.appPrefix}:${event.arn}`;
		return this.eventbusProvider.publish(arn, event.data, event.resources);
	}
}
