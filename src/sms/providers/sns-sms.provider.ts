import { SmsProviderInterface } from "../interfaces/sms-provider.interface";
import { inject, injectable, injectWithTransform } from "tsyringe";
import { LoggerTransform } from "../../logger/log-context.transform";
import { LoggerInterface } from "../../logger/interfaces/logger.interface";
import * as SNS from "aws-sdk/clients/sns";

@injectable()
export class SnsSmsProvider implements SmsProviderInterface {
	constructor(
		@injectWithTransform("Logger", LoggerTransform, { module: "SnsSmsProvider" }) private logger: LoggerInterface,
		@inject("region") private region: string
	) {}

	public async send(phoneNumber: string, text: string): Promise<boolean> {
		this.logger.info(`Sending SMS to ${phoneNumber}...`);

		const ses = new SNS({
			apiVersion: "2010-03-31",
			region: this.region,
		});

		try {
			let result = await ses
				.publish({
					PhoneNumber: phoneNumber,
					Message: text,
				})
				.promise();
			if (!result.MessageId) {
				this.logger.warn(`Error sending SMS:`, result);
			}

			return Boolean(result.MessageId);
		} catch (e) {
			this.logger.error(`Error sending SMS:`, e);
			return false;
		}
	}
}
