import { SmsProviderInterface } from "../interfaces/sms-provider.interface";
import { injectable, injectWithTransform } from "tsyringe";
import { LoggerTransform } from "../../logger/log-context.transform";
import { LoggerInterface } from "../../logger/interfaces/logger.interface";

@injectable()
export class TestSmsProvider implements SmsProviderInterface {
	constructor(
		@injectWithTransform("Logger", LoggerTransform, { module: "TestSmsProvider" }) private logger: LoggerInterface
	) {}

	public async send(phoneNumber: string, text: string): Promise<boolean> {
		this.logger.info(`Sending SMS to ${phoneNumber} (imitation):`, text);

		return true;
	}
}
