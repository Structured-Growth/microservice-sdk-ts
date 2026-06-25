import { container, inject, injectable } from "tsyringe";
import { QueueInterface } from "./interfaces/queue.interface";
import { QueueProviderInterface } from "./interfaces/queue-provider.interface";

@injectable()
export class QueueService implements QueueInterface {
	constructor(@inject("QueueProvider") private queueProvider: QueueProviderInterface) {}

	public async publish(queueName: string, subject: string, message: object, resources?: string[]): Promise<boolean> {
		return this.queueProvider.publish(queueName, subject, message, resources);
	}

	public subscribe(queueName: string, handler) {
		return this.queueProvider.subscribe(queueName, handler);
	}
}
