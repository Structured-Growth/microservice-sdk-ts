import { Request, Response } from "express";
import { LoggerInterface } from "../logger/interfaces/logger.interface";
import { container } from "tsyringe";

export abstract class BaseController {
	protected logger: LoggerInterface;

	constructor(protected request: Request, protected response: Response) {
		this.logger = container.resolve<LoggerInterface>("Logger");
		this.logger.module = this.constructor.name || "Controller";
	}
}
