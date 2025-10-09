import Dm20151123, { SingleSendMailRequest } from "@alicloud/dm20151123";
import * as OpenApi from "@alicloud/openapi-client";
import { autoInjectable, injectWithTransform } from "tsyringe";
import { LoggerInterface } from "../../logger/interfaces/logger.interface";
import { LoggerTransform } from "../../logger/log-context.transform";
import { EmailTransportInterface } from "../intrefaces/email-transport.interface";

@autoInjectable()
export class AliyunDmEmailTransport implements EmailTransportInterface {
	private client?: Dm20151123;
	private misconfiguredReason?: string;

	private endpoint: string;
	private accountName: string;
	private fromAlias?: string;
	private replyToAddress: string;
	private addressType: number;
	private tagName?: string;
	private clickTrace?: string;
	private replyAddress?: string;
	private replyAddressAlias?: string;

	constructor(
		@injectWithTransform("Logger", LoggerTransform, { module: "AliyunDmEmailTransport" })
		private logger: LoggerInterface
	) {
		const env = {
			accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
			accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
			endpoint: process.env.ALIYUN_DM_ENDPOINT || "dm.aliyuncs.com",
			accountName: process.env.ALIYUN_DM_ACCOUNT_NAME,
			fromAlias: process.env.ALIYUN_DM_FROM_ALIAS,
			replyToAddress: process.env.ALIYUN_DM_REPLY_TO_ADDRESS ?? "true",
			addressType: Number(process.env.ALIYUN_DM_ADDRESS_TYPE ?? "1"),
			tagName: process.env.ALIYUN_DM_TAG_NAME,
			clickTrace: process.env.ALIYUN_DM_CLICK_TRACE ?? "0",
			replyAddress: process.env.ALIYUN_DM_REPLY_ADDRESS,
			replyAddressAlias: process.env.ALIYUN_DM_REPLY_ADDRESS_ALIAS,
		};

		const missing: string[] = [];
		if (!env.accessKeyId) missing.push("ALIBABA_CLOUD_ACCESS_KEY_ID");
		if (!env.accessKeySecret) missing.push("ALIBABA_CLOUD_ACCESS_KEY_SECRET");
		if (!env.accountName) missing.push("ALIYUN_DM_ACCOUNT_NAME");

		if (missing.length > 0) {
			this.misconfiguredReason = `Aliyun DirectMail is not configured: missing ${missing.join(", ")}.`;
			this.logger.warn(this.misconfiguredReason);
			return;
		}

		this.endpoint = env.endpoint;
		this.accountName = env.accountName;
		this.fromAlias = env.fromAlias;
		this.replyToAddress = env.replyToAddress;
		this.addressType = env.addressType;
		this.tagName = env.tagName;
		this.clickTrace = env.clickTrace;
		this.replyAddress = env.replyAddress;
		this.replyAddressAlias = env.replyAddressAlias;

		const config = new OpenApi.Config({
			accessKeyId: env.accessKeyId,
			accessKeySecret: env.accessKeySecret,
			endpoint: this.endpoint,
		});

		this.client = new Dm20151123(config);
	}

	public async send(params: {
		toEmail: string;
		fromEmail: string;
		fromName?: string;
		subject: string;
		html: string;
		text?: string;
	}): Promise<boolean> {
		if (!this.client) {
			this.logger.warn(
				`Aliyun DM send() skipped: provider is not configured. ${this.misconfiguredReason ?? ""}`.trim()
			);
			return false;
		}

		if (params.fromEmail && params.fromEmail.toLowerCase() !== this.accountName.toLowerCase()) {
			this.logger.warn(
				`Aliyun DM: fromEmail (${params.fromEmail}) different from AccountName (${this.accountName}). AccountName will be used.`
			);
		}

		const toAddresses = params.toEmail
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		const to = toAddresses.join(",");

		const request = new SingleSendMailRequest({
			accountName: this.accountName,
			toAddress: to,
			subject: params.subject,
			htmlBody: params.html,
			textBody: params.text,
			fromAlias: params.fromName || this.fromAlias,
			replyToAddress: this.replyToAddress,
			addressType: this.addressType,
			tagName: this.tagName,
			clickTrace: this.clickTrace,
			replyAddress: this.replyAddress,
			replyAddressAlias: this.replyAddressAlias,
		});

		try {
			this.logger.info(`Aliyun DM: sending email to ${to} via ${this.endpoint}...`);
			const resp = await this.client.singleSendMail(request);
			const body: any = (resp as any)?.body ?? {};
			const envId = body?.EnvId || body?.envId;
			const requestId = body?.RequestId || body?.requestId;

			if (envId) {
				this.logger.info(`Aliyun DM sent. envId=${envId}, requestId=${requestId ?? "n/a"}`);
				return true;
			}

			this.logger.warn(`Aliyun DM: no EnvId in response`, body);
			return false;
		} catch (e: any) {
			const code = e?.data?.Code || e?.code;
			const message = e?.data?.Message || e?.message || String(e);
			this.logger.error(`Aliyun DM error: code=${code ?? "unknown"} message=${message}`, e);
			return false;
		}
	}
}
