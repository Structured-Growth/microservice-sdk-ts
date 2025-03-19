import "reflect-metadata";
import { config } from "dotenv";
import { autoInjectable, container, inject, injectWithTransform, Lifecycle } from "tsyringe";
import { handleRequest, Logger, LoggerInterface, LoggerTransform, logWriters } from "../../src";
import { EventbusInterface, eventBusProviders, EventbusService } from "../../src/eventbus";
import { random } from "lodash";

config({ path: ".env" });

describe("Http handler event", () => {
	let eventbus: EventbusInterface;

	before(() => {
		container.register("appPrefix", { useValue: process.env.APP_PREFIX || "microservice-sdk" });
		container.register("eventbusName", { useValue: process.env.EVENTBUS_NAME || "sg-eventbus-dev" });
		container.register("region", { useValue: process.env.REGION || "us-west-2" });
		container.register("LogWriter", logWriters.ConsoleLogWriter, { lifecycle: Lifecycle.Singleton });
		container.register("Logger", Logger);
		container.register("EventbusProvider", eventBusProviders.AwsEventBridgeEventbusProvider);
		container.register("EventbusService", EventbusService);
		container.register("authenticationEnabled", { useValue: false });
		container.register("authorizationEnabled", { useValue: false });
		container.register("EventbusService", EventbusService);
		eventbus = container.resolve<EventbusInterface>("EventbusService");
	});

	it("Must handle request", async () => {

		@autoInjectable()
		class Controller {

			private __: any;

			constructor(
				@injectWithTransform("Logger", LoggerTransform, { module: "Test" }) private logger: LoggerInterface,
				@inject("i18n") private i18n: () => any
			) {
				this.__ = i18n?.call(null);
			}

			public init() {}

			public async create() {
				this.logger.info("test " + this.__);

				await new Promise((resolve, reject) => {
					setTimeout(() => {
						this.logger.info("test2: " + this.__);
						resolve(null);
					}, random(500, 1000));
				})

				return {};
			}
		}

		const handler = handleRequest(Controller, "create");

		const sampleRequest = (lang) => {
			return {
				params: {},
				query: {},
				body: {},
				url: "",
				headers: {
					"Accept-Language": lang,
				},
			} as any;
		};

		await Promise.all([
			handler(sampleRequest("zh-CN"), {
				json: () => {},
				status: () => {},
			} as any),

			handler(sampleRequest("pt-BR"), {
				json: () => {},
				status: () => {},
			} as any),

			handler(sampleRequest("en-US"), {
				json: () => {},
				status: () => {},
			} as any),
		]);
	});
});
