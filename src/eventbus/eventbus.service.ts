import { inject, injectable } from "tsyringe";
import { EventbusInterface } from "./interfaces/eventbus.interface";
import { EventbusProviderInterface } from "./interfaces/eventbus-provider.interface";
import { EventInterface } from "../events";

@injectable()
export class EventbusService implements EventbusInterface {
	constructor(@inject("EventbusProvider") private eventbusProvider: EventbusProviderInterface) {}

	public async publish(event: EventInterface): Promise<boolean> {
		return this.eventbusProvider.publish(event.arn, event.data);
	}
}
