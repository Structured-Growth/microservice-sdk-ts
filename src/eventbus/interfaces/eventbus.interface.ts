import { EventInterface } from "../../events";

export interface EventbusInterface {
	/**
	 * Publish a message
	 */
	publish(event: EventInterface): Promise<boolean>;
}
