import { container } from "tsyringe";
import { Request, Response } from "express";
import * as hyperid from "hyperid";
import { Logger } from "../logger";
import { asyncLocalStorage } from "../common/async-local-storage";
import { ValidationError } from "../common/errors/validation.error";

const generator = hyperid({ urlSafe: true });

export function handleRequest(
	controllerClass,
	method: string,
	options: {
		logRequestBody?: boolean;
		logResponses?: boolean;
	} = {}
) {
	const controller = new controllerClass();
	const logger = container.resolve<Logger>("Logger");
	logger.module = "Http";

	return async function (req: Request, res: Response) {
		await asyncLocalStorage.run(generator(), async () => {
			const startTime = new Date().getTime();
			const { params, query, body } = req;
			let msg = options.logRequestBody ? JSON.stringify({ query, body }) : "";
			let result;

			try {
				controller.init(req, res);
				await controller.authenticate();
				await controller.authorize(method);
				result = await controller[method]?.call(controller, ...Object.values(params), query, body);
				res.json(result);
				options.logResponses && (msg += " " + JSON.stringify(result));
			} catch (e) {
				res.status([401, 402, 404, 422].includes(e.code) ? e.code : 500);
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
				logger.debug(req.method, res.statusCode, req.path, `${endTime - startTime}ms`, msg || "");
			}
		});
	};
}
