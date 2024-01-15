export interface LogWriterInterface {
	debug(module: string, ...msg): void;

	notice(module: string, ...msg): void;

	info(module: string, ...msg): void;

	warn(module: string, ...msg): void;

	error(module: string, ...msg): void;

	critical(module: string, ...msg): void;
}
