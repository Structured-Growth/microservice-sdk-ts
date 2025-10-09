import { SnsSmsProvider } from "./sns-sms.provider";
import { TestSmsProvider } from "./test-sms.provider";
import { AliyunSmsProvider } from "./aliyun-sms.provider";

export const smsProviders = {
	SnsSmsProvider,
	TestSmsProvider,
	AliyunSmsProvider,
};

export { SnsSmsProvider, AliyunSmsProvider };
