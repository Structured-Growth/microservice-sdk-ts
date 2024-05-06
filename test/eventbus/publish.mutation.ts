import "reflect-metadata";
import { config } from "dotenv";
import { assert } from "chai";
import { container, Lifecycle } from "tsyringe";
import { EventTest, Logger, logWriters, RegionEnum } from "../../src";
import { EventbusInterface, eventBusProviders, EventbusService } from "../../src/eventbus";
import { EventMutation } from "../../src/events/registered-events/event-mutation";

config({ path: ".env" });

describe("Publish mutation event", () => {
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

	it("Must publish mutation event", async () => {
		const result = await eventbus.publish(new EventMutation("test", "test", "test", JSON.stringify({})));
		assert.equal(result, true);
	});
});
