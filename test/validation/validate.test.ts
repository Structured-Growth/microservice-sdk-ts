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

		global.fetch = async (url, options) => {
			let json;

			if (typeof url === "string" && url.includes("translation-set") && url.includes("45")) {
				const lang = url.split("/").pop();

				if (lang === "zh-CN") {
					json = async () => ({
						test: {
							accountId: "账户ID",
						},
					});
				} else if (lang === "pt-BR") {
					json = async () => ({
						test: {
							accountId: "ID da Conta",
						},
					});
				} else {
					json = async () => ({
						test: {
							accountId: "Account ID",
						},
					});
				}
			}

			if (typeof url === "string" && url.includes("translation-set") && url.includes("101")) {
				const lang = url.split("/").pop();

				if (lang === "zh-CN") {
					json = async () => ({
						"joi.any.required": "{{#label}} 是必填项",
					});
				} else if (lang === "pt-BR") {
					json = async () => ({
						"joi.any.required": "{{#label}} é obrigatório",
					});
				} else {
					json = async () => ({
						"joi.any.required": "{{#label}} is required",
					});
				}
			}

			return {
				ok: true,
				status: 200,
				json,
				text: async () => JSON.stringify(await json()),
				clone: () => ({ json, text: async () => JSON.stringify(await json()), status: 200, ok: true } as Response),
			} as Response;
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
		expect(messages["zh-CN"]).equal("账户ID 是必填项");
		expect(messages["pt-BR"]).equal("ID da Conta é obrigatório");
	});
});
