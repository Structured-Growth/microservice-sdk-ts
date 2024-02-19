import {autoInjectable, inject} from "tsyringe";
import { LoggerInterface } from "../logger/interfaces/logger.interface";
import { EmailTransportInterface } from "./intrefaces/email-transport.interface";

@autoInjectable()
export class Mailer {
	constructor(
		@inject("Logger") private logger: LoggerInterface,
		@inject("EmailTransport") private transport: EmailTransportInterface
	) {}

	public async send(params: {
		toEmail: string;
		fromEmail: string;
		fromName?: string;
		subject: string;
		html: string;
		text?: string;
	}): Promise<boolean> {
		return this.transport.send(params);
	}
}
