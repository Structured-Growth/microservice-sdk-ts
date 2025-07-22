import { container } from "tsyringe";
import { Request, Response } from "express";
import * as hyperid from "hyperid";
import { Logger } from "../logger";
import { asyncLocalStorage } from "../common/async-local-storage";
import { ValidationError } from "../common/errors/validation.error";
import { getI18nInstance } from "./i18n";
import { applySensitiveFieldTransformations } from "../common/apply-sensitive-field-transformations";

const generator = hyperid({ urlSafe: true });

export function handleRequest(
	controllerClass,
	method: string,
	options: {
		logRequestBody?: boolean;
		logResponses?: boolean;
	} = {}
) {
	const logger = container.resolve<Logger>("Logger");
	logger.module = "Http";

	return async function (req: Request, res: Response) {
		const acceptLanguageHeader = req.headers["Accept-Language"] || req.headers["accept-language"] || "unknown";
		const i18nInstance = await getI18nInstance(req);

		const store = {
			id: generator(),
			i18n: i18nInstance,
		};

		await asyncLocalStorage.run(store, async () => {
			const controller = new controllerClass();
			const authenticationEnabled = container.resolve<boolean>("authenticationEnabled");
			const authorizationEnabled = container.resolve<boolean>("authorizationEnabled");
			const startTime = new Date().getTime();
			const { params, query, body } = req;
			const metadata = Reflect.getMetadata(`__action:${method}`, controllerClass.prototype);
			const maskFields = metadata?.maskFields || [];
			const hashFields = metadata?.hashFields || [];
			console.log("Mask fields:", maskFields);
			console.log("Hash fields:", hashFields);
			// let msg = options.logRequestBody ? JSON.stringify({ query, body }) : "";
			const safePayload = applySensitiveFieldTransformations({ body, query, params }, maskFields, hashFields);
			let msg = options.logRequestBody ? JSON.stringify({ query: safePayload.query, body: safePayload.body }) : "";

			let result;

			try {
				controller.init(req, res);
				// authenticate principal via OAuth Server
				if (authenticationEnabled === true && controller.authenticationEnabled) {
					await controller.authenticate();
				}
				// authorize request via Policies Service
				if (authorizationEnabled === true && controller.authorizationEnabled) {
					await controller.authorize(method);
				}
				result = await controller[method]?.call(controller, ...Object.values(params), query, body);
				res.json(result);
				options.logResponses && (msg += " " + JSON.stringify(result));
			} catch (e) {
				res.status([400, 401, 402, 403, 404, 422].includes(e.code) ? e.code : 500);
				result = {
					code: e.code,
					name: e.name,
					message: e.message,
				};
				if (e instanceof ValidationError) {
					result.validation = e.validation || {};
				}
				if (res.statusCode === 500) {
					msg = e.message;
					msg += "\n" + e.stack;
				}
				res.json(result);
				options.logResponses && (msg += " " + JSON.stringify(result));
			} finally {
				const endTime = new Date().getTime();
				const principal = controller.principal?.arn ?? "unknown";

				logger.debug(
					req.method,
					res.statusCode,
					req.path,
					`${endTime - startTime}ms`,
					`lang=${acceptLanguageHeader}`,
					`principal=${principal}`,
					msg || ""
				);
			}
		});
	};
}
