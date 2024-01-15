import { LogWriterInterface } from "./log-writer.interface";

export interface LoggerInterface extends LogWriterInterface {
	module: string;
}
