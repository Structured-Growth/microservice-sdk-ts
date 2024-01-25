import { container } from "tsyringe";
import { Request, Response } from "express";
import * as hyperid from "hyperid";
import { Logger } from "../logger/logger";
import { asyncLocalStorage } from "../common/async-local-storage";

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

			try {
				controller.init(req, res);
				const result = await controller[method]?.call(controller, ...Object.values(params), query, body);
				res.status(200);
				res.json(result);
				options.logResponses && (msg += " " + JSON.stringify(result));
			} catch (e) {
				msg = e.message;
				msg += "\n" + e.stack;
				res.status(500);
				const result = {};
				res.json(result);
				options.logResponses && (msg += " " + JSON.stringify(result));
			} finally {
				const endTime = new Date().getTime();
				logger.debug(req.method, res.statusCode, req.path, `${endTime - startTime}ms`, msg || "");
			}
		});
	};
}
