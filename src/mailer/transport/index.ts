import { SesEmailTransport } from "./ses-email-transport";
import { TestEmailTransport } from "./test-email-transport";
import { AliyunDmEmailTransport } from "./aliyun-dm-email-transport";

export const emailTransports = {
	SesEmailTransport,
	TestEmailTransport,
	AliyunDmEmailTransport,
};
