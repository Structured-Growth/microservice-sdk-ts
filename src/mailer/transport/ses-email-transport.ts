import * as SES from "aws-sdk/clients/ses";
import { EmailTransportInterface } from "../intrefaces/email-transport.interface";
import { autoInjectable, inject, injectWithTransform } from "tsyringe";
import { LoggerInterface } from "../../logger/interfaces/logger.interface";
import { LoggerTransform } from "../../logger/log-context.transform";

@autoInjectable()
export class SesEmailTransport implements EmailTransportInterface {
	constructor(
		@injectWithTransform("Logger", LoggerTransform, { module: "SesEmailTransport" }) private logger: LoggerInterface,
		@inject("region") private region: string
	) {}

	public async send(params: {
		toEmail: string;
		fromEmail: string;
		fromName?: string;
		subject: string;
		html: string;
		text?: string;
	}): Promise<boolean> {
		this.logger.info(`Sending email to ${params.toEmail}...`);

		const opts = {
			Destination: {
				ToAddresses: [params.toEmail],
			},
			Message: {
				Body: {
					Html: {
						Charset: "UTF-8",
						Data: params.html,
					},
					Text: {
						Charset: "UTF-8",
						Data: params.text || "",
					},
				},
				Subject: {
					Charset: "UTF-8",
					Data: params.subject,
				},
			},
			Source: params.fromName || params.fromEmail,
			ReplyToAddresses: [params.fromEmail],
		};

		let ses = new SES({
			apiVersion: "2010-12-01",
			region: this.region,
		});

		try {
			let result = await ses.sendEmail(opts).promise();
			if (!result.MessageId) {
				this.logger.warn(`Error sending email:`, result);
			}

			return Boolean(result.MessageId);
		} catch (e) {
			this.logger.error(`Error sending email:`, e);
			return false;
		}
	}
}
