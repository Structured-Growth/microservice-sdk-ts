import { container, Lifecycle } from "tsyringe";
import { Logger } from "./logger/logger";
import { ConsoleLogWriter } from "./logger/writers/console-log-writer";

export { ConfigLoader } from "./common/config-loader";
export { handleRequest } from "./http/handle-request";
export { LoggerTransform } from "./logger/log-context.transform";
export { LoggerInterface } from "./logger/interfaces/logger.interface";
export { Logger, ConsoleLogWriter };

export function registerConsoleLogger() {
	container.register("LogWriter", ConsoleLogWriter, { lifecycle: Lifecycle.Singleton });
	container.register("Logger", Logger);
}
