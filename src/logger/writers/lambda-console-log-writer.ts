import { injectable } from "tsyringe";
import { LogWriterInterface } from "../interfaces/log-writer.interface";

@injectable()
export class LambdaConsoleLogWriter implements LogWriterInterface {
	constructor() {
		this.info("Logger", "Initialized log writer: LambdaConsoleLogWriter");
	}

	public debug(module: string, ...msg): void {
		console.debug(this.prefix(module), ...msg);
	}

	public notice(module: string, ...msg): void {
		console.log(this.prefix(module), ...msg);
	}

	public info(module: string, ...msg): void {
		console.info(this.prefix(module), ...msg);
	}

	public warn(module: string, ...msg): void {
		console.warn(this.prefix(module), ...msg);
	}

	public error(module: string, ...msg): void {
		console.error(this.prefix(module), ...msg);
	}

	public critical(module: string, ...msg): void {
		console.error(this.prefix(module), ...msg);
	}

	private prefix(module: string) {
		return `[${module}]`;
	}
}
