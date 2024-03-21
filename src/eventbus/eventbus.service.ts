import { container, inject, injectable } from "tsyringe";
import { EventbusInterface } from "./interfaces/eventbus.interface";
import { EventbusProviderInterface } from "./interfaces/eventbus-provider.interface";

@injectable()
export class EventbusService implements EventbusInterface {
	constructor(@inject("EventbusProvider") private eventbusProvider: EventbusProviderInterface) {}

	public async publish(subject: string, message: object): Promise<boolean> {
		return this.eventbusProvider.publish(subject, message);
	}
}
