import { inject, injectable, injectWithTransform } from "tsyringe";
import * as EventBridge from "aws-sdk/clients/eventbridge";
import { EventbusProviderInterface } from "../interfaces/eventbus-provider.interface";
import { LoggerInterface } from "../../logger/interfaces/logger.interface";
import { ServerError } from "../../common/errors/server.error";
import { LoggerTransform } from "../../logger/log-context.transform";
import { buildAwsClientConfig } from "../../common/aws-client-config";

@injectable()
export class AwsEventBridgeEventbusProvider implements EventbusProviderInterface {
	constructor(
		@inject("appPrefix") private appPrefix: string,
		@inject("eventbusName") private eventbusName: string,
		@inject("region") private region: string,
		@injectWithTransform("Logger", LoggerTransform, { module: "AwsEventBridgeEventbusProvider" })
		private logger: LoggerInterface
	) {}

	public async publish(subject: string, message: object, resources?: string[]): Promise<boolean> {
		this.logger.info(`Sending event: ${subject}`);

		let eventBridge = new EventBridge(buildAwsClientConfig(this.region, "AWS_EVENTBRIDGE_ENDPOINT"));

		if (!this.appPrefix) {
			throw new ServerError("appPrefix must be defined");
		}

		if (!this.eventbusName) {
			throw new ServerError("Eventbus name must be defined");
		}

		let result = await eventBridge
			.putEvents({
				Entries: [
					{
						EventBusName: this.eventbusName,
						Source: this.appPrefix,
						DetailType: subject,
						Detail: JSON.stringify(message),
						Resources: resources,
					},
				],
			})
			.promise();

		if (result.FailedEntryCount > 0) {
			this.logger.error(`Error when put events to EventBridge: ${JSON.stringify(result)}`);
		}

		return result.FailedEntryCount === 0;
	}
}
