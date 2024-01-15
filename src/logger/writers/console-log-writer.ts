import { injectable } from "tsyringe";
import { asyncLocalStorage } from "../../common/async-local-storage";
import { LogWriterInterface } from "../interfaces/log-writer.interface";

@injectable()
export class ConsoleLogWriter implements LogWriterInterface {
	constructor() {
		this.info("Logger", "Initialized log writer: ConsoleLogWriter");
	}

	public debug(module: string, ...msg): void {
		console.debug(this.prefix(module, "DEBUG"), ...msg);
	}

	public notice(module: string, ...msg): void {
		console.log(this.prefix(module, "NOTICE"), ...msg);
	}

	public info(module: string, ...msg): void {
		console.info(this.prefix(module, "INFO"), ...msg);
	}

	public warn(module: string, ...msg): void {
		console.warn(this.prefix(module, "WARN"), ...msg);
	}

	public error(module: string, ...msg): void {
		console.error(this.prefix(module, "ERROR"), ...msg);
	}

	public critical(module: string, ...msg): void {
		console.error(this.prefix(module, "CRITICAL"), ...msg);
	}

	private prefix(module: string, level: string) {
		const id = asyncLocalStorage.getStore();
		return `[${new Date().toISOString()}] [${id || ""}] ${level} [${module}]`;
	}
}
