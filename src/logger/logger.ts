import { autoInjectable, inject } from "tsyringe";
import { LoggerInterface } from "./interfaces/logger.interface";

@autoInjectable()
export class Logger {
	public module: string = "Global";

	constructor(@inject("LogWriter") private logWriter?: LoggerInterface) {}

	public debug(...msg): void {
		this.logWriter.debug(this.module, ...msg);
	}

	public notice(...msg): void {
		this.logWriter.notice(this.module, ...msg);
	}

	public info(...msg): void {
		this.logWriter.info(this.module, ...msg);
	}

	public warn(...msg): void {
		this.logWriter.warn(this.module, ...msg);
	}

	public error(...msg): void {
		this.logWriter.error(this.module, ...msg);
	}

	public critical(...msg): void {
		this.logWriter.error(this.module, ...msg);
	}
}
