import { container } from "tsyringe";
import { Request, Response } from "express";
import * as hyperid from "hyperid";
import { Logger } from "../logger/logger";
import { asyncLocalStorage } from "../common/async-local-storage";

const generator = hyperid({ urlSafe: true });

export function handleRequest(controllerClass, method: string) {
	const controller = new controllerClass();
	const logQueries = container.resolve("logQueries");
	const logResponses = container.resolve("logResponses");
	const logger = container.resolve<Logger>("Logger");
	logger.module = "Http";

	return async function (req: Request, res: Response) {
		await asyncLocalStorage.run(generator(), async () => {
			const startTime = new Date().getTime();
			const { params, query, body } = req;
			let msg = logQueries ? JSON.stringify({ query, body }) : "";
			console.log(params, query, body);
			try {
				const result = await controller[method]?.call(controller, ...Object.values(params), query, body);
				res.status(200);
				res.json(result);
				logResponses && (msg += " " + JSON.stringify(result));
			} catch (e) {
				msg = e.message;
				msg += "\n" + e.stack;
				res.status(500);
				const result = {};
				res.json(result);
				logResponses && (msg += " " + JSON.stringify(result));
			} finally {
				const endTime = new Date().getTime();
				logger.debug(req.method, res.statusCode, req.path, `${endTime - startTime}ms`, msg || "");
			}
		});
	};
}
