import "reflect-metadata";
import { config } from "dotenv";
import { assert } from "chai";
import { container, Lifecycle } from "tsyringe";
import { logWriters, Logger } from "../../src";
import { QueueInterface, queueProviders, QueueService } from "../../src/queue";

config({ path: ".env" });

describe("Subscribe to event", () => {
	let queue: QueueInterface;

	before(() => {
		container.register("appPrefix", { useValue: process.env.APP_PREFIX || "microservice-sdk" });
		container.register("region", { useValue: process.env.REGION || "us-west-2" });
		container.register("LogWriter", logWriters.ConsoleLogWriter, { lifecycle: Lifecycle.Singleton });
		container.register("Logger", Logger);
		container.register("QueueProvider", queueProviders.AwsSqsQueueProvider);
		container.register("QueueService", QueueService);
		queue = container.resolve<QueueInterface>("QueueService");
	});

	it("Must handle event", async () => {
		queue.subscribe("sg-zoho-integration-dev", (message) => {
			console.log(message);
			throw new Error("test error")
		});
		await new Promise((res) => setTimeout(res, 120000));
	});
});
