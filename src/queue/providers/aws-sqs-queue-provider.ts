import { inject, injectable, injectWithTransform } from "tsyringe";
import * as Sqs from "aws-sdk/clients/sqs";
import { QueueProviderInterface } from "../interfaces/queue-provider.interface";
import { Consumer } from "sqs-consumer";
import { LoggerInterface } from "../../logger/interfaces/logger.interface";
import { ServerError } from "../../common/errors/server.error";
import { LoggerTransform } from "../../logger/log-context.transform";
import { Message } from "aws-sdk/clients/sqs";
import { SQSClient } from "@aws-sdk/client-sqs";
import { buildAwsClientConfig } from "../../common/aws-client-config";

@injectable()
export class AwsSqsQueueProvider implements QueueProviderInterface {
	constructor(
		@inject("appPrefix") private appPrefix: string,
		@inject("region") private region: string,
		@injectWithTransform("Logger", LoggerTransform, { module: "AwsSqsQueueProvider" })
		private logger: LoggerInterface
	) {}

	public async publish(queueName: string, subject: string, message: object, resources?: string[]): Promise<boolean> {
		this.logger.info(`Sending event ${subject} to ${queueName}`);

		if (!this.appPrefix) {
			throw new ServerError("appPrefix must be defined");
		}

		let sqs = new Sqs(buildAwsClientConfig(this.region, "AWS_SQS_ENDPOINT"));

		if (!this.appPrefix) {
			throw new ServerError("appPrefix must be defined");
		}

		const result = await sqs
			.sendMessage({
				QueueUrl: queueName,
				MessageBody: JSON.stringify({ subject, message, resources }),
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
				resources?: string[];
			},
			event?: Message
		) => Promise<void> | void
	): void {
		const consumer = Consumer.create({
			region: this.region,
			queueUrl: queueName,
			sqs: new SQSClient(buildAwsClientConfig(this.region, "AWS_SQS_ENDPOINT")),
			handleMessage: async (message) => {
				const { Type, source, ...event } = JSON.parse(message.Body);
				const subject = event["detail-type"] || event["subject"];
				this.logger.debug(`Event received: ${subject} from ${source}`);

				// handle SNS notifications
				if (Type === "Notification") {
					await handler(
						{
							source: "sns.amazonaws.com",
							subject: "notification",
							message: JSON.parse(event["Message"]),
							resources: event["resources"],
						},
						message
					);
					// handle EventBridge events
				} else {
					await handler(
						{
							source,
							subject,
							message: event["detail"] || event["message"],
							resources: event["resources"],
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
