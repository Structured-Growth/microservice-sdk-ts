import "reflect-metadata";
import { autoInjectable, container, inject, injectWithTransform, Lifecycle } from "tsyringe";
import { AuthService, handleRequest, Logger, LoggerInterface, LoggerTransform, logWriters } from "../../src";
import { EventbusInterface, eventBusProviders, EventbusService } from "../../src/eventbus";
import { random } from "lodash";
import { getI18nInstance, translationSetFetching, translationSetCache, loadTranslations } from "../../src/http/i18n";
import { expect } from "chai";

describe("Http handler event - i18n integration", () => {
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
		container.register("oAuthServiceGetUserUrl", { useValue: "#" });
		container.register("internalAuthenticationEnabled", { useValue: true });
		container.register("internalAuthenticationJwtSecret", {
			useValue: "E98tIrddUq5MuiPO407oM1sV9B3T4eh0450AuJ7Uk5xvrU2COT",
		});
		container.register("EventbusService", EventbusService);
		container.register("AuthService", AuthService);
		eventbus = container.resolve<EventbusInterface>("EventbusService");
	});

	it("Must handle request with i18n and check caching", async () => {
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

				await new Promise((resolve) => {
					setTimeout(() => {
						this.logger.info("test2: " + this.__);
						resolve(null);
					}, random(500, 1000));
				});

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

		const i18nInstanceZh = await getI18nInstance(sampleRequest("zh-CN"));
		const i18nInstancePt = await getI18nInstance(sampleRequest("pt-BR"));
		const i18nInstanceEn = await getI18nInstance(sampleRequest("en-US"));

		expect(i18nInstanceZh.getLocale()).to.equal("zh-CN");
		expect(i18nInstancePt.getLocale()).to.equal("pt-BR");
		expect(i18nInstanceEn.getLocale()).to.equal("en-US");

		const cacheBefore = { ...translationSetCache };
		await loadTranslations("zh-CN");
		await loadTranslations("pt-BR");

		expect(translationSetCache["zh-CN"]).to.not.be.undefined;
		expect(translationSetCache["pt-BR"]).to.not.be.undefined;

		const cacheAfter = { ...translationSetCache };
		expect(cacheBefore).to.deep.equal(cacheAfter);

		const fetchingBefore = { ...translationSetFetching };
		await Promise.all([
			handler(sampleRequest("zh-CN"), { json: () => {}, status: () => {} } as any),
			handler(sampleRequest("zh-CN"), { json: () => {}, status: () => {} } as any),
			handler(sampleRequest("zh-CN"), { json: () => {}, status: () => {} } as any),
		]);

		const fetchingAfter = { ...translationSetFetching };
		expect(fetchingBefore).to.deep.equal(fetchingAfter);
	});
});
