import "reflect-metadata";
import { config } from "dotenv";
import { assert } from "chai";
import { container, Lifecycle } from "tsyringe";
import { logWriters, Logger } from "../../src";
import { EventbusInterface, eventBusProviders, EventbusService } from "../../src/eventbus";

config({ path: ".env" });

describe("Publish event", () => {
	let eventbus: EventbusInterface;

	before(() => {
		container.register("appPrefix", { useValue: process.env.APP_PREFIX || "microservice-sdk" });
		container.register("eventbusName", { useValue: process.env.EVENTBUS_NAME || "sg-eventbus-dev" });
		container.register("region", { useValue: process.env.REGION || "us-west-2" });
		container.register("LogWriter", logWriters.ConsoleLogWriter, { lifecycle: Lifecycle.Singleton });
		container.register("Logger", Logger);
		container.register("EventbusProvider", eventBusProviders.AwsEventBridgeEventbusProvider);
		container.register("EventbusService", EventbusService);
		eventbus = container.resolve<EventbusInterface>("EventbusService");
	});

	it("Must publish event", async () => {
		const result = await eventbus.publish("test", { test: "ok" });
		assert.equal(result, true);
	});
});
