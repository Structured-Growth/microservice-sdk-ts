import { LambdaConsoleLogWriter } from "./lambda-console-log-writer";
import { ConsoleLogWriter } from "./console-log-writer";

export const logWriters = {
	LambdaConsoleLogWriter: LambdaConsoleLogWriter,
	ConsoleLogWriter: ConsoleLogWriter,
};
