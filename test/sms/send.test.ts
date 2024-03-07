import "reflect-metadata";
import { config } from "dotenv";
import { container, Lifecycle } from "tsyringe";
import { logWriters, Logger } from "../../src";
import { assert } from "chai";
import { smsProviders, SmsService } from "../../src/sms";

config({ path: ".env" });

describe("Should send SMS", () => {
	let smsService: SmsService;

	before(() => {
		container.register("region", { useValue: process.env.REGION || "us-west-2" });
		container.register("LogWriter", logWriters.ConsoleLogWriter, { lifecycle: Lifecycle.Singleton });
		container.register("Logger", Logger);
		container.register("SmsProvider", smsProviders.TestSmsProvider);
		container.register("SmsService", SmsService);
		smsService = container.resolve<SmsService>("SmsService");
	});

	it("Must send SMS", async () => {
		const result = await smsService.send("380676339920", "test");
		assert.isTrue(result);
	});
});
