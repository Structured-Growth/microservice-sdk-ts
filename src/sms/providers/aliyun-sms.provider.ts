import { SmsProviderInterface } from "../interfaces/sms-provider.interface";
import { injectable, injectWithTransform } from "tsyringe";
import { LoggerTransform } from "../../logger/log-context.transform";
import { LoggerInterface } from "../../logger/interfaces/logger.interface";
import Dysmsapi20170525, { SendSmsRequest } from "@alicloud/dysmsapi20170525";
import * as OpenApi from "@alicloud/openapi-client";

@injectable()
export class AliyunSmsProvider implements SmsProviderInterface {
	private client?: Dysmsapi20170525;
	private signName?: string;
	private templateCode?: string;
	private templateVar: string;
	private misconfiguredReason?: string;

	constructor(
		@injectWithTransform("Logger", LoggerTransform, { module: "AliyunSmsProvider" }) private logger: LoggerInterface
	) {
		const env = {
			accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
			accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
			signName: process.env.ALIYUN_SMS_SIGN_NAME,
			templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE,
			endpoint: process.env.ALIYUN_SMS_ENDPOINT ?? "dysmsapi.aliyuncs.com",
			templateVar: process.env.ALIYUN_SMS_TEMPLATE_VAR ?? "code",
		};

		const missing: string[] = [];
		if (!env.accessKeyId) missing.push("ALIBABA_CLOUD_ACCESS_KEY_ID");
		if (!env.accessKeySecret) missing.push("ALIBABA_CLOUD_ACCESS_KEY_SECRET");
		if (!env.signName) missing.push("ALIYUN_SMS_SIGN_NAME");
		if (!env.templateCode) missing.push("ALIYUN_SMS_TEMPLATE_CODE");

		if (missing.length > 0) {
			this.misconfiguredReason = `Aliyun SMS is not configured: missing ${missing.join(", ")}.`;
			this.logger.warn(this.misconfiguredReason);
			return;
		}

		const config = new OpenApi.Config({
			accessKeyId: env.accessKeyId,
			accessKeySecret: env.accessKeySecret,
			endpoint: env.endpoint,
		});

		this.client = new Dysmsapi20170525(config);
		this.signName = env.signName;
		this.templateCode = env.templateCode;
		this.templateVar = env.templateVar;
	}

	public async send(phoneNumber: string, text: string): Promise<boolean> {
		if (!this.client || !this.signName || !this.templateCode) {
			this.logger.warn(
				`Aliyun SMS send() skipped: provider is not configured. ${this.misconfiguredReason ?? ""}`.trim()
			);
			return false;
		}

		this.logger.info(`Sending Aliyun SMS to ${phoneNumber}...`);

		const normalizedPhone = phoneNumber.replace(/^\+?86/, "");
		const templateParam: Record<string, string> = {
			[this.templateVar]: text,
		};

		const request = new SendSmsRequest({
			phoneNumbers: normalizedPhone,
			signName: this.signName,
			templateCode: this.templateCode,
			templateParam: JSON.stringify(templateParam),
		});

		try {
			const resp = await this.client.sendSms(request);
			const code = (resp as any)?.body?.code;
			const bizId = (resp as any)?.body?.bizId;
			const message = (resp as any)?.body?.message;

			if (code === "OK") {
				this.logger.info(`Aliyun SMS sent. bizId=${bizId}`);
				return true;
			}

			this.logger.warn(`Aliyun SMS failed. code=${code}, message=${message}`);
			return false;
		} catch (e) {
			this.logger.error("Aliyun SMS error:", e);
			return false;
		}
	}
}
