import { EmailTransportInterface } from "../intrefaces/email-transport.interface";
import { autoInjectable, inject, injectWithTransform } from "tsyringe";
import { LoggerTransform } from "../../logger/log-context.transform";
import { LoggerInterface } from "../../logger/interfaces/logger.interface";

@autoInjectable()
export class TestEmailTransport implements EmailTransportInterface {
	constructor(
		@injectWithTransform("Logger", LoggerTransform, { module: "TestEmailTransport" }) private logger: LoggerInterface
	) {}

	public async send(params: {
		toEmail: string;
		fromEmail: string;
		fromName?: string;
		subject: string;
		html: string;
		text?: string;
	}): Promise<boolean> {
		this.logger.debug(`Sending email: `, params);
	}
}
