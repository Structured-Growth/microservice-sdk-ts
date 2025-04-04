import "reflect-metadata";
import { joi } from "../../src";
import { autoInjectable, container, inject, injectWithTransform, Lifecycle } from "tsyringe";
import {
	AuthService,
	handleRequest,
	Logger,
	LoggerInterface,
	LoggerTransform,
	logWriters,
	ValidateFuncArgs,
} from "../../src";
import { EventbusInterface, eventBusProviders, EventbusService } from "../../src";
import { expect } from "chai";
import * as fs from "fs";

describe("Http handler event - joi integration", () => {
	let eventbus: EventbusInterface;
	let originalReadFileSync: typeof fs.readFileSync;

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

	beforeEach(async () => {
		originalReadFileSync = fs.readFileSync;

		(fs.readFileSync as any) = (filePath: any, encoding: any) => {
			if (filePath.includes("en-US")) {
				return JSON.stringify({
					test: {
						accountId: "Account ID",
					},
				});
			} else if (filePath.includes("zh-CN")) {
				return JSON.stringify({
					test: {
						accountId: "账户ID",
					},
				});
			} else if (filePath.includes("pt-BR")) {
				return JSON.stringify({
					test: {
						accountId: "ID da Conta",
					},
				});
			}
			throw new Error("Mocked: File not found");
		};
	});

	afterEach(() => {
		(fs.readFileSync as any) = originalReadFileSync;
	});

	it("Must return Joi error message in correct language", async () => {
		const messages = {};

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

			@ValidateFuncArgs(
				joi.object({
					accountId: joi.number().positive().required().label("test.accountId"),
				})
			)
			public async create() {
				return {};
			}
		}

		const handler = handleRequest(Controller, "create");

		const langs = ["zh-CN", "pt-BR", "en-US"];

		await Promise.all(
			langs.map(async (lang) => {
				let statusCode;
				let jsonBody;

				const res: any = {
					status: (code) => {
						statusCode = code;
					},
					json: (data) => {
						jsonBody = data;
					},
				};

				await handler(
					{
						params: {},
						query: {},
						body: {},
						headers: { "accept-language": lang },
					} as any,
					res
				);

				expect(statusCode).to.equal(422);
				expect(jsonBody).to.have.property("message");
				messages[lang] = jsonBody.message;
			})
		);

		expect(messages["en-US"]).equal("Account ID is required");
		expect(messages["zh-CN"]).equal("Account ID is required");
		expect(messages["pt-BR"]).equal("Account ID is required");
	});
});
