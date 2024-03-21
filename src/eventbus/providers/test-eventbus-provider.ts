import { inject, injectable, injectWithTransform } from "tsyringe";
import { LoggerTransform } from "../../logger/log-context.transform";
import { EventbusProviderInterface } from "../interfaces/eventbus-provider.interface";
import { LoggerInterface } from "../../logger/interfaces/logger.interface";
import { ServerError } from "../../common/errors/server.error";

@injectable()
export class TestEventbusProvider implements EventbusProviderInterface {
	constructor(
		@inject("appPrefix") private appPrefix: string,
		@inject("eventbusName") private eventbusName: string,
		@injectWithTransform("Logger", LoggerTransform, { module: "TestEventbusProvider" })
		private logger: LoggerInterface
	) {}

	public async publish(subject: string, message: object): Promise<boolean> {
		this.logger.info(`Sending event (imitation): ${subject}`);

		if (!this.appPrefix) {
			throw new ServerError("appPrefix must be defined");
		}

		if (!this.eventbusName) {
			throw new ServerError("Eventbus name must be defined");
		}

		// let listener = container.resolve<ListenerInterface>(`${this.eventbusAppSource}.eb.Listener`);
		// await listener?.run({
		// 	type: subject,
		// 	details: message,
		// });

		return true;
	}
}
