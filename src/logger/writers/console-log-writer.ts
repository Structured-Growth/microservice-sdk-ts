import { injectable } from "tsyringe";
import { inspect } from "util";
import * as winston from "winston";
import { asyncLocalStorage } from "../../common/async-local-storage";
import { LogWriterInterface } from "../interfaces/log-writer.interface";

@injectable()
export class ConsoleLogWriter implements LogWriterInterface {
	private readonly logger: winston.Logger;
	private readonly colorizer: winston.Logform.Colorizer;

	constructor() {
		winston.addColors({
			critical: "bold red",
			error: "red",
			warn: "yellow",
			notice: "cyan",
			info: "green",
			debug: "dim gray",
		});

		this.colorizer = winston.format.colorize();
		this.logger = winston.createLogger({
			levels: {
				critical: 0,
				error: 1,
				warn: 2,
				notice: 3,
				info: 4,
				debug: 5,
			},
			level: "debug",
			format: winston.format.combine(
				winston.format.timestamp(),
				winston.format.printf((info) => {
					const store = asyncLocalStorage.getStore();
					const level = String(info.level);
					const isDebug = level === "debug";
					const messages = Array.isArray(info.messages) ? info.messages : [info.message];
					const renderedLevel = isDebug ? level.toUpperCase() : this.colorizer.colorize(level, level.toUpperCase());

					const line = `[${info.timestamp}] [${store?.id || ""}] ${renderedLevel} [${info.module}] ${messages
						.map((message) => this.formatMessage(message, !isDebug))
						.join(" ")}`;

					return isDebug ? this.colorizer.colorize(level, line) : line;
				})
			),
			transports: [new winston.transports.Console()],
		});

		this.info("Logger", "Initialized log writer: ConsoleLogWriter");
	}

	public debug(module: string, ...msg): void {
		this.write("debug", module, msg);
	}

	public notice(module: string, ...msg): void {
		this.write("notice", module, msg);
	}

	public info(module: string, ...msg): void {
		this.write("info", module, msg);
	}

	public warn(module: string, ...msg): void {
		this.write("warn", module, msg);
	}

	public error(module: string, ...msg): void {
		this.write("error", module, msg);
	}

	public critical(module: string, ...msg): void {
		this.write("critical", module, msg);
	}

	private write(level: string, module: string, msg: unknown[]): void {
		this.logger.log(level, "", { module, messages: msg });
	}

	private formatMessage(message: unknown, colors: boolean): string {
		if (message instanceof Error) {
			return message.stack || message.message;
		}

		if (typeof message === "string") {
			return message;
		}

		return inspect(message, { colors, depth: null });
	}
}
