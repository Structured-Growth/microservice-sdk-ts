import { container, inject, injectable, injectWithTransform } from "tsyringe";
import { QueueProviderInterface } from "../interfaces/queue-provider.interface";
import { LoggerInterface } from "../../logger/interfaces/logger.interface";
import { LoggerTransform } from "../../logger/log-context.transform";
import { ServerError } from "../../common/errors/server.error";

@injectable()
export class TestQueueProvider implements QueueProviderInterface {
	constructor(
		@inject("appPrefix") private appPrefix: string,
		@inject("region") private region: string,
		@injectWithTransform("Logger", LoggerTransform, { module: "TestQueueProvider" })
		private logger: LoggerInterface
	) {}

	public async publish(queueName: string, subject: string, message: object): Promise<boolean> {
		this.logger.info(`Sending job (imitation): ${subject}`);

		if (!this.appPrefix) {
			throw new ServerError("appPrefix must be defined");
		}

		// let listener = container.resolve<ListenerInterface>(`${this.eventbusAppSource}.eb.Listener`);
		// await listener?.run({
		//     type: subject,
		//     details: message
		// });

		return true;
	}

	public subscribe(
		queueName: string,
		handler: (message: { source: string; subject: string; message: object }) => Promise<void> | void
	): void {
		return undefined;
	}
}
