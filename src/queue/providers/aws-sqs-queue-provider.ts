import { inject, injectable, injectWithTransform } from "tsyringe";
import * as Sqs from "aws-sdk/clients/sqs";
import { QueueProviderInterface } from "../interfaces/queue-provider.interface";
import { Consumer } from "sqs-consumer";
import { LoggerInterface } from "../../logger/interfaces/logger.interface";
import { ServerError } from "../../common/errors/server.error";
import { LoggerTransform } from "../../logger/log-context.transform";
import { Message } from "aws-sdk/clients/sqs";

@injectable()
export class AwsSqsQueueProvider implements QueueProviderInterface {
	constructor(
		@inject("appPrefix") private appPrefix: string,
		@inject("region") private region: string,
		@injectWithTransform("Logger", LoggerTransform, { module: "AwsSqsQueueProvider" })
		private logger: LoggerInterface
	) {}

	public async publish(queueName: string, subject: string, message: object): Promise<boolean> {
		this.logger.info(`Sending event: ${subject}`);

		if (!this.appPrefix) {
			throw new ServerError("appPrefix must be defined");
		}

		let sqs = new Sqs({
			region: this.region,
		});

		if (!this.appPrefix) {
			throw new ServerError("appPrefix must be defined");
		}

		const result = await sqs
			.sendMessage({
				QueueUrl: queueName,
				MessageBody: JSON.stringify({ subject, message }),
			})
			.promise();

		return !!result.MessageId;
	}

	public subscribe(
		queueName: string,
		handler: (
			message: {
				source: string;
				subject: string;
				message: object;
			},
			event?: Message
		) => Promise<void> | void
	): void {
		const consumer = Consumer.create({
			region: this.region,
			queueUrl: queueName,
			handleMessage: async (message) => {
				this.logger.debug(JSON.stringify(message));
				const { Type, source, ...event } = JSON.parse(message.Body);
				// handle SNS notifications
				if (Type === "Notification") {
					handler(
						{
							source: "sns.amazonaws.com",
							subject: "notification",
							message: JSON.parse(event["Message"]),
						},
						message
					);
					// handle EventBridge events
				} else {
					handler(
						{
							source,
							subject: event["detail-type"],
							message: event["detail"],
						},
						message
					);
				}
			},
		});

		consumer.on("error", (err) => {
			this.logger.error(err.message);
		});

		consumer.on("processing_error", (err) => {
			this.logger.error(err.message);
		});

		consumer.start();
	}
}
