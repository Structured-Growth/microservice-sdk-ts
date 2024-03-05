import { SesEmailTransport } from "./ses-email-transport";
import { TestEmailTransport } from "./test-email-transport";

export const emailTransports = {
	SesEmailTransport: SesEmailTransport,
	TestEmailTransport: TestEmailTransport,
};
