import { Transform } from "tsyringe/dist/typings/types";
import { Logger } from "./logger";

export class LoggerTransform implements Transform<Logger, Logger> {
	transform(
		logger: Logger,
		context: {
			module: string;
		}
	): Logger {
		logger.module = context.module;
		return logger;
	}
}
